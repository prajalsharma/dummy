import { BotContext } from '../types';
import { Redis } from 'ioredis';
import { placeTradeCommand } from './long';

export async function shortCommand(ctx: BotContext, redis: Redis) {
  await placeTradeCommand(ctx, redis, 'short');
}
