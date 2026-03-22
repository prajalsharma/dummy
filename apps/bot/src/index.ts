import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { setupCommands } from './commands';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import { errorMiddleware } from './middleware/error';
import { NotificationService } from './services/notification';
import { BotContext } from './types';

async function bootstrap() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
  if (!process.env.ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32');
  }

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', { err }));

  const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN);

  // Session middleware
  bot.use(session());

  // Error handler
  bot.use(errorMiddleware);

  // Rate limiting
  bot.use(rateLimitMiddleware(redis));

  // Auth / user resolution
  bot.use(authMiddleware);

  // Register all commands
  setupCommands(bot, redis);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down bot...');
    bot.stop('SIGTERM');
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  // Start notification listener (Redis pub/sub)
  const notificationService = new NotificationService(bot, redis);
  await notificationService.start();

  // Launch the bot (bot.launch() never resolves — log before calling it)
  logger.info('Telegram bot starting (polling)...');
  bot.launch({ dropPendingUpdates: true });
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
