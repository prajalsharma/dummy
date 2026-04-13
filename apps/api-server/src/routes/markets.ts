import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import { CACHE_TTL } from '@risex/shared';

interface PluginOptions {
  redis: Redis;
}

export const marketsRouter: FastifyPluginAsync<PluginOptions> = async (app, { redis }) => {
  app.get('/', async (req, reply) => {
    const cacheKey = 'cache:markets';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return reply.header('X-Cache', 'HIT').send(JSON.parse(cached));
    }

    const markets = await prisma.marketCache.findMany({
      orderBy: { volume24h: 'desc' },
    });

    await redis.setex(cacheKey, CACHE_TTL.MARKETS, JSON.stringify(markets));
    return reply.header('X-Cache', 'MISS').send(markets);
  });

  app.get('/:symbol', async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const market = await prisma.marketCache.findUnique({ where: { symbol } });
    if (!market) return reply.status(404).send({ error: 'Market not found' });
    return market;
  });
};
