import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { marketsRouter } from './routes/markets';
import { leaderboardRouter } from './routes/leaderboard';
import { userRouter } from './routes/user';
import { tradesRouter } from './routes/trades';
import { feedRouter } from './routes/feed';
import { statsRouter } from './routes/stats';
import { wsHandler } from './ws/handler';

async function bootstrap() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
  });

  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  // CORS
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => req.ip,
  });

  // WebSocket support
  await app.register(websocket);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // API routes (all prefixed with /api/v1)
  await app.register(marketsRouter, { prefix: '/api/v1/markets', redis });
  await app.register(leaderboardRouter, { prefix: '/api/v1/leaderboard', redis });
  await app.register(userRouter, { prefix: '/api/v1/user' });
  await app.register(tradesRouter, { prefix: '/api/v1/trades' });
  await app.register(feedRouter, { prefix: '/api/v1/feed', redis });
  await app.register(statsRouter, { prefix: '/api/v1/stats', redis });

  // WebSocket endpoint
  app.get('/ws', { websocket: true }, wsHandler(redis));

  const port = parseInt(process.env.PORT || '4000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
  logger.info(`API server listening on ${host}:${port}`);

  const shutdown = async () => {
    logger.info('Shutting down API server...');
    await app.close();
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
