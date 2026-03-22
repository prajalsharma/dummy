import 'dotenv/config';
import { Redis } from 'ioredis';
import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@risex/shared';
import { logger } from './logger';
import { TradeWorker } from './workers/tradeWorker';
import { ClosePositionWorker } from './workers/closePositionWorker';
import { PnlSyncService } from './services/pnlSync';

async function bootstrap() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', { err }));

  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '10', 10);

  // Trade order worker
  const tradeWorker = new TradeWorker(redis, concurrency);
  await tradeWorker.start();

  // Close position worker
  const closeWorker = new ClosePositionWorker(redis, concurrency);
  await closeWorker.start();

  // PnL sync service (periodic)
  const pnlSync = new PnlSyncService(redis);
  await pnlSync.start();

  const shutdown = async () => {
    logger.info('Shutting down trading engine...');
    await tradeWorker.stop();
    await closeWorker.stop();
    await pnlSync.stop();
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  logger.info(`Trading engine started (concurrency: ${concurrency})`);
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
