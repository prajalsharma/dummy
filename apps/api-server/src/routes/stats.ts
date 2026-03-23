import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import { CACHE_TTL } from '@risex/shared';

interface PluginOptions {
  redis: Redis;
}

export const statsRouter: FastifyPluginAsync<PluginOptions> = async (app, { redis }) => {
  // GET /api/v1/stats — platform-wide stats banner
  app.get('/', async (req, reply) => {
    const cacheKey = 'cache:stats';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return reply.header('X-Cache', 'HIT').send(JSON.parse(cached));
    }

    const [
      totalTraders,
      totalTrades,
      openPositions,
      volumeAgg,
      topPnlAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count({ where: { status: 'FILLED' } }),
      prisma.position.count({ where: { isOpen: true } }),
      prisma.order.aggregate({
        where: { status: 'FILLED' },
        _sum: { marginUSDC: true },
      }),
      prisma.leaderboardEntry.aggregate({
        _sum: { totalPnl: true, realizedPnl: true },
        _max: { totalPnl: true },
      }),
    ]);

    const totalVolumeNotional = Number(volumeAgg._sum?.marginUSDC ?? 0);
    const totalPnlAllTraders = Number(topPnlAgg._sum?.totalPnl ?? 0);
    const topTraderPnl = Number(topPnlAgg._max?.totalPnl ?? 0);

    const result = {
      totalTraders,
      totalTrades,
      openPositions,
      totalVolumeUSDC: totalVolumeNotional,
      totalPnlUSDC: totalPnlAllTraders,
      topTraderPnlUSDC: topTraderPnl,
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(cacheKey, CACHE_TTL.STATS, JSON.stringify(result));
    return reply.header('X-Cache', 'MISS').send(result);
  });
};
