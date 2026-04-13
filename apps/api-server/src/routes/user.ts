import { FastifyPluginAsync } from 'fastify';
import { verifyMessage } from 'viem';
import { prisma } from '@risex/database';

const LINK_WALLET_MESSAGE = 'Link this wallet to my RISEx trading account';

export const userRouter: FastifyPluginAsync = async (app) => {
  // Get user by wallet address
  app.get('/by-wallet/:address', async (req, reply) => {
    const { address } = req.params as { address: string };

    // Basic address format validation
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return reply.status(400).send({ error: 'Invalid address format' });
    }

    const wallet = await prisma.wallet.findFirst({
      where: { address: address.toLowerCase(), isActive: true },
      include: {
        user: {
          include: {
            telegramAccount: { select: { telegramId: true, username: true, firstName: true } },
            leaderboard: true,
            _count: { select: { positions: true } },
          },
        },
      },
    });

    if (!wallet) return reply.status(404).send({ error: 'User not found' });

    return {
      userId: wallet.user.id,
      walletAddress: wallet.address,
      referralCode: wallet.user.referralCode,
      telegram: wallet.user.telegramAccount,
      leaderboard: wallet.user.leaderboard,
      totalTrades: wallet.user._count.positions,
    };
  });

  // Link wallet address to user — signature must be verified against the address
  app.post('/link-wallet', async (req, reply) => {
    const { address, signature, telegramId } = req.body as {
      address: string;
      signature: string;
      telegramId?: string;
    };

    if (!address || !signature) {
      return reply.status(400).send({ error: 'address and signature required' });
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return reply.status(400).send({ error: 'Invalid address format' });
    }

    // SECURITY: verify the signature proves ownership of the address
    let sigValid = false;
    try {
      sigValid = await verifyMessage({
        address: address as `0x${string}`,
        message: LINK_WALLET_MESSAGE,
        signature: signature as `0x${string}`,
      });
    } catch {
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    if (!sigValid) {
      return reply.status(401).send({ error: 'Signature verification failed' });
    }

    // Find user by telegram account
    let user;
    if (telegramId) {
      const tg = await prisma.telegramAccount.findUnique({
        where: { telegramId },
        include: { user: true },
      });
      user = tg?.user;
    }

    if (!user) {
      return reply.status(404).send({ error: 'User not found. Please /start the bot first.' });
    }

    // Upsert wallet
    const wallet = await prisma.wallet.upsert({
      where: { address: address.toLowerCase() },
      update: { userId: user.id, isActive: true },
      create: { userId: user.id, address: address.toLowerCase() },
    });

    return { success: true, walletId: wallet.id, message: LINK_WALLET_MESSAGE };
  });

  // Get user positions
  app.get('/:userId/positions', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { open } = req.query as { open?: string };

    // Validate userId is UUID format to prevent injection
    if (!/^[0-9a-f-]{36}$/.test(userId)) {
      return reply.status(400).send({ error: 'Invalid userId' });
    }

    const positions = await prisma.position.findMany({
      where: {
        userId,
        ...(open !== undefined ? { isOpen: open === 'true' } : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });

    return positions.map((p: any) => ({
      ...p,
      marginUSDC: Number(p.marginUSDC),
      size: Number(p.size),
      entryPrice: Number(p.entryPrice),
      markPrice: p.markPrice ? Number(p.markPrice) : null,
      unrealizedPnl: p.unrealizedPnl ? Number(p.unrealizedPnl) : null,
      realizedPnl: p.realizedPnl ? Number(p.realizedPnl) : null,
      liquidationPrice: p.liquidationPrice ? Number(p.liquidationPrice) : null,
    }));
  });
};
