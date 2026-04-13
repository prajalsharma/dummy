import { Redis } from 'ioredis';
import { MiddlewareFn } from 'telegraf';
import { BotContext } from '../types';
import { RATE_LIMITS } from '@risex/shared';
import { logger } from '../logger';

export function rateLimitMiddleware(redis: Redis): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    // Global rate limit: 30 messages per second across all users
    const globalKey = 'ratelimit:global:sec';
    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) {
      await redis.pexpire(globalKey, 1000); // 1 second window
    }
    if (globalCount > RATE_LIMITS.TELEGRAM_GLOBAL_PER_SEC) {
      logger.warn('Global rate limit exceeded', { globalCount });
      // Drop silently to avoid sending too many replies and making it worse
      return;
    }

    // Per-user rate limit: 20 messages per minute
    const userKey = `ratelimit:user:${userId}`;
    const current = await redis.incr(userKey);
    if (current === 1) {
      await redis.expire(userKey, 60); // 1 minute window
    }

    if (current > RATE_LIMITS.TELEGRAM_USER_PER_MIN) {
      logger.warn('User rate limit exceeded', { userId, count: current });
      await ctx.reply('⚠️ You are sending too many requests. Please wait a minute.');
      return;
    }

    return next();
  };
}
