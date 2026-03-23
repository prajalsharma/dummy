import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../logger';

// Close position handling is embedded in TradeWorker via job.name === 'close-position'
// This is a placeholder for dedicated close-position queue if needed
export class ClosePositionWorker {
  private redis: Redis;

  constructor(redis: Redis, _concurrency: number) {
    this.redis = redis;
  }

  async start() {
    logger.info('ClosePositionWorker: using TradeWorker queue (close-position jobs)');
  }

  async stop() {}
}
