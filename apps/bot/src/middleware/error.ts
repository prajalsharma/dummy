import { MiddlewareFn } from 'telegraf';
import { BotContext } from '../types';
import { logger } from '../logger';

export const errorMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    logger.error('Unhandled bot error', { err, update: ctx.update });
    try {
      await ctx.reply('❌ An unexpected error occurred. Please try again later.');
    } catch {
      // ignore send errors
    }
  }
};
