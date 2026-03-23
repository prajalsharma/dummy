import { createPublicClient, http, webSocket, parseAbiItem } from 'viem';
import { Redis } from 'ioredis';
import { RISECHAIN_CHAIN_ID, REDIS_CHANNELS } from '@risex/shared';
import { prisma } from '@risex/database';
import { logger } from '../logger';

// Risechain testnet definition
const risechainTestnet = {
  id: RISECHAIN_CHAIN_ID,
  name: 'Risechain Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RISECHAIN_RPC_URL || 'https://testnet.risechain.com'] },
  },
} as const;

// USDC Transfer event ABI
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

export class RisechainListener {
  private client: any;
  private redis: Redis;
  private publisher: Redis;
  private unwatchBlocks: (() => void) | null = null;
  private unwatchTransfers: (() => void) | null = null;

  constructor(rpcUrl: string, _wsUrl: string, redis: Redis) {
    this.client = createPublicClient({
      chain: risechainTestnet as any,
      transport: http(rpcUrl),
    });
    this.redis = redis;
    this.publisher = redis.duplicate();
  }

  async start() {
    logger.info('Starting Risechain block listener');
    this.watchBlocks();
    this.watchUsdcTransfers();
  }

  private watchBlocks() {
    try {
      this.unwatchBlocks = this.client.watchBlocks({
        onBlock: async (block: any) => {
          logger.debug('New block', { number: block.number });

          await this.publisher.publish(
            REDIS_CHANNELS.BLOCK_EVENTS,
            JSON.stringify({
              type: 'new_block',
              blockNumber: block.number?.toString(),
              timestamp: block.timestamp?.toString(),
            }),
          );
        },
        onError: (err: any) => {
          logger.error('Block watch error', { err });
          // Reconnect after delay
          setTimeout(() => this.watchBlocks(), 5000);
        },
      }) as unknown as () => void;
    } catch (err) {
      logger.error('Failed to start block watcher', { err });
      setTimeout(() => this.watchBlocks(), 10000);
    }
  }

  private watchUsdcTransfers() {
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS as `0x${string}` | undefined;
    if (!usdcAddress) {
      logger.warn('USDC_CONTRACT_ADDRESS not set, skipping transfer watch');
      return;
    }

    try {
      this.unwatchTransfers = this.client.watchContractEvent({
        address: usdcAddress,
        abi: [TRANSFER_EVENT],
        eventName: 'Transfer',
        onLogs: async (logs: any) => {
          for (const log of logs) {
            await this.handleTransfer(log);
          }
        },
        onError: (err: any) => {
          logger.error('Transfer watch error', { err });
          setTimeout(() => this.watchUsdcTransfers(), 5000);
        },
      });
    } catch (err) {
      logger.error('Failed to start transfer watcher', { err });
    }
  }

  private async handleTransfer(log: any) {
    const toAddress: string = log.args?.to?.toLowerCase();
    if (!toAddress) return;

    // Check if this address belongs to a user
    const wallet = await prisma.wallet.findFirst({
      where: { address: toAddress, isActive: true },
    });

    if (!wallet) return;

    const amount = Number(log.args?.value ?? 0) / 1e6; // USDC has 6 decimals
    logger.info('USDC deposit detected', { address: toAddress, amount, txHash: log.transactionHash });

    await this.publisher.publish(
      REDIS_CHANNELS.BLOCK_EVENTS,
      JSON.stringify({
        type: 'deposit',
        walletAddress: toAddress,
        amount,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString(),
      }),
    );
  }

  async stop() {
    if (this.unwatchBlocks) this.unwatchBlocks();
    if (this.unwatchTransfers) this.unwatchTransfers();
    await this.publisher.quit();
    logger.info('Risechain listener stopped');
  }
}
