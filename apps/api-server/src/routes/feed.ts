import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import { truncateAddress } from '@risex/shared';

interface PluginOptions {
  redis: Redis;
}

export const feedRouter: FastifyPluginAsync<PluginOptions> = async (app, { redis }) => {
  // GET /api/v1/feed — recent trade fills (social feed)
  app.get('/', async (req, reply) => {
    const { limit = '30', offset = '0' } = req.query as { limit?: string; offset?: string };
    const cacheKey = `cache:feed:${limit}:${offset}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return reply.header('X-Cache', 'HIT').send(JSON.parse(cached));
    }

    const orders = await prisma.order.findMany({
      where: { status: 'FILLED' },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
      skip: parseInt(offset, 10),
      include: {
        user: {
          include: {
            telegramAccount: { select: { username: true, firstName: true } },
            wallets: { where: { isActive: true }, select: { address: true }, take: 1 },
          },
        },
      },
    });

    const result = orders.map((o: any) => {
      const tgAccount = o.user?.telegramAccount;
      const walletAddr = o.user?.wallets?.[0]?.address;
      const displayName = tgAccount?.username
        ? `@${tgAccount.username}`
        : tgAccount?.firstName || (walletAddr ? truncateAddress(walletAddr) : 'Anon');

      return {
        id: o.id,
        displayName,
        walletAddress: walletAddr || null,
        market: o.market,
        side: o.side,
        marginUSDC: Number(o.marginUSDC),
        leverage: o.leverage,
        notional: Number(o.marginUSDC) * o.leverage,
        entryPrice: o.entryPrice ? Number(o.entryPrice) : null,
        size: o.size ? Number(o.size) : null,
        filledAt: o.updatedAt,
      };
    });

    await redis.setex(cacheKey, 10, JSON.stringify(result));
    return reply.header('X-Cache', 'MISS').send(result);
  });
};
