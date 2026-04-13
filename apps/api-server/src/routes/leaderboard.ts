import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import { CACHE_TTL } from '@risex/shared';

interface PluginOptions {
  redis: Redis;
}

export const leaderboardRouter: FastifyPluginAsync<PluginOptions> = async (app, { redis }) => {
  app.get('/', async (req, reply) => {
    const { limit = '50', offset = '0' } = req.query as { limit?: string; offset?: string };
    const cacheKey = `cache:leaderboard:${limit}:${offset}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return reply.header('X-Cache', 'HIT').send(JSON.parse(cached));
    }

    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: { totalPnl: 'desc' },
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

    const result = entries.map((e: any, i: number) => ({
      rank: parseInt(offset, 10) + i + 1,
      userId: e.userId,
      username: e.user.telegramAccount?.username || e.user.telegramAccount?.firstName || null,
      walletAddress: e.user.wallets[0]?.address || null,
      totalPnl: Number(e.totalPnl),
      realizedPnl: Number(e.realizedPnl),
      tradeCount: e.tradeCount,
      winCount: e.winCount,
      winRate: Number(e.winRate),
      volume: Number(e.volume),
    }));

    await redis.setex(cacheKey, CACHE_TTL.LEADERBOARD, JSON.stringify(result));
    return reply.header('X-Cache', 'MISS').send(result);
  });
};
