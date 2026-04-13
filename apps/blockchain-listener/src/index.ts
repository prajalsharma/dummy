import 'dotenv/config';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { RisechainListener } from './listeners/risechain';
import { RisexWsListener } from './listeners/risexWs';

async function bootstrap() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required');
  }

  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', { err }));

  const rpcUrl = process.env.RISECHAIN_RPC_URL || 'https://testnet.risechain.com';
  const wsRpcUrl = process.env.RISECHAIN_WS_URL || 'wss://testnet.risechain.com';

  const risechainListener = new RisechainListener(rpcUrl, wsRpcUrl, redis);
  await risechainListener.start();

  const risexWsListener = new RisexWsListener(
    process.env.RISEX_WS_URL || 'wss://ws.risex.io',
    redis,
  );
  await risexWsListener.start();

  const shutdown = async () => {
    logger.info('Shutting down blockchain listener...');
    await risechainListener.stop();
    await risexWsListener.stop();
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  logger.info('Blockchain listener started');
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
