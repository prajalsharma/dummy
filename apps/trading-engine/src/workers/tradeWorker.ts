import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import {
  QUEUE_NAMES,
  REDIS_CHANNELS,
  TradeJob,
  calculateLiquidationPrice,
} from '@risex/shared';
import { RisexTradingClient } from '../services/risexTrading';
import { logger } from '../logger';

export class TradeWorker {
  private worker: Worker;
  private publisher: Redis;

  constructor(redis: Redis, concurrency: number) {
    this.publisher = redis.duplicate();

    this.worker = new Worker(
      QUEUE_NAMES.TRADE_QUEUE,
      async (job: Job) => {
        if (job.name === 'place-order') {
          await this.handlePlaceOrder(job.data as TradeJob);
        } else if (job.name === 'close-position') {
          await this.handleClosePosition(job.data);
        }
      },
      {
        connection: redis as any,
        concurrency,
        limiter: { max: 100, duration: 1000 }, // 100 jobs/sec
      },
    );

    this.worker.on('failed', (job, err) => {
      logger.error('Trade job failed', { jobId: job?.id, err });
    });
  }

  private async handlePlaceOrder(job: TradeJob) {
    const { userId, telegramChatId, request } = job;
    logger.info('Processing trade order', { userId, market: request.market, side: request.side });

    // Get wallet
    const wallet = await prisma.wallet.findFirst({
      where: { userId, isActive: true },
    });

    if (!wallet) {
      await this.publishResult(telegramChatId, {
        success: false,
        error: 'No active wallet found.',
      });
      return;
    }

    // Create pending order record
    const order = await prisma.order.create({
      data: {
        userId,
        market: request.market,
        side: request.side === 'long' ? 'LONG' : 'SHORT',
        type: request.type === 'market' ? 'MARKET' : 'LIMIT',
        status: 'PENDING',
        marginUSDC: request.marginUSDC,
        leverage: request.leverage,
        limitPrice: request.limitPrice ?? null,
      },
    });

    try {
      // Calculate position size from margin * leverage / price
      const client = new RisexTradingClient();
      const markets = await client.getMarkets();
      const market = markets.find((m) => m.symbol === request.market || m.baseAsset === request.market);
      const markPrice = market?.markPrice ?? 0;
      const notionalUSDC = request.marginUSDC * request.leverage;
      const size = markPrice > 0 ? notionalUSDC / markPrice : 0;

      // Place order on RISEx
      const orderResult = await client.placeOrder({
        walletAddress: wallet.address,
        market: request.market,
        side: request.side,
        type: request.type,
        size,
        leverage: request.leverage,
        limitPrice: request.limitPrice,
      });

      const entryPrice = orderResult.filledPrice || markPrice;
      const liqPrice = calculateLiquidationPrice(request.side, entryPrice, request.leverage);

      // Update order to filled
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'FILLED',
          externalOrderId: orderResult.orderId,
          entryPrice,
          size,
        },
      });

      // Create position
      const position = await prisma.position.create({
        data: {
          userId,
          orderId: order.id,
          externalPosId: orderResult.orderId,
          market: request.market,
          side: request.side === 'long' ? 'LONG' : 'SHORT',
          size,
          entryPrice,
          marginUSDC: request.marginUSDC,
          leverage: request.leverage,
          liquidationPrice: liqPrice,
          isOpen: true,
        },
      });

      // Update leaderboard trade count
      await prisma.leaderboardEntry.upsert({
        where: { userId },
        update: { tradeCount: { increment: 1 } },
        create: { userId, tradeCount: 1 },
      });

      // Notify user
      await this.publishResult(telegramChatId, {
        success: true,
        market: request.market,
        side: request.side,
        size: size.toFixed(4),
        entryPrice,
        marginUSDC: request.marginUSDC,
        leverage: request.leverage,
        positionId: position.id,
      });

      logger.info('Trade order filled', { orderId: order.id, positionId: position.id });
    } catch (err: any) {
      logger.error('Trade order failed', { orderId: order.id, err });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED', errorMessage: err.message },
      });

      await this.publishResult(telegramChatId, {
        success: false,
        error: err.message || 'Order placement failed.',
      });
    }
  }

  private async handleClosePosition(data: any) {
    const { userId, telegramChatId, positionId, market } = data;
    logger.info('Closing position', { positionId });

    const position = await prisma.position.findFirst({
      where: { id: positionId, userId, isOpen: true },
    });

    if (!position) {
      await this.publishResult(telegramChatId, {
        success: false,
        error: 'Position not found or already closed.',
      });
      return;
    }

    const wallet = await prisma.wallet.findFirst({ where: { userId, isActive: true } });
    if (!wallet) {
      await this.publishResult(telegramChatId, { success: false, error: 'No wallet found.' });
      return;
    }

    try {
      const client = new RisexTradingClient();
      const result = await client.closePosition(position.externalPosId || positionId, market);

      const closePrice = result.filledPrice || Number(position.entryPrice);
      const realizedPnl =
        position.side === 'LONG'
          ? Number(position.size) * (closePrice - Number(position.entryPrice))
          : Number(position.size) * (Number(position.entryPrice) - closePrice);

      await prisma.position.update({
        where: { id: position.id },
        data: {
          isOpen: false,
          closedAt: new Date(),
          realizedPnl,
          markPrice: closePrice,
        },
      });

      // Update leaderboard PnL
      const isWin = realizedPnl > 0;
      await prisma.leaderboardEntry.upsert({
        where: { userId },
        update: {
          totalPnl: { increment: realizedPnl },
          realizedPnl: { increment: realizedPnl },
          winCount: isWin ? { increment: 1 } : undefined,
          lossCount: !isWin ? { increment: 1 } : undefined,
        },
        create: {
          userId,
          totalPnl: realizedPnl,
          realizedPnl,
          winCount: isWin ? 1 : 0,
          lossCount: isWin ? 0 : 1,
        },
      });

      // Recalculate win rate
      const lb = await prisma.leaderboardEntry.findUnique({ where: { userId } });
      if (lb && lb.tradeCount > 0) {
        await prisma.leaderboardEntry.update({
          where: { userId },
          data: { winRate: lb.winCount / lb.tradeCount },
        });
      }

      await this.publishResult(telegramChatId, {
        success: true,
        type: 'close',
        market,
        realizedPnl,
        closePrice,
        positionId: position.id,
      });
    } catch (err: any) {
      logger.error('Close position failed', { positionId, err });
      await this.publishResult(telegramChatId, {
        success: false,
        error: err.message || 'Failed to close position.',
      });
    }
  }

  private async publishResult(chatId: string, data: object) {
    await this.publisher.publish(
      REDIS_CHANNELS.TRADE_RESULTS,
      JSON.stringify({ telegramChatId: chatId, ...data }),
    );
  }

  async start() {
    logger.info('Trade worker started');
  }

  async stop() {
    await this.worker.close();
    await this.publisher.quit();
  }
}
