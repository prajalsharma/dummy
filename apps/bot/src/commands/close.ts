import { BotContext } from '../types';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@risex/shared';
import { prisma } from '@risex/database';
import { randomUUID } from 'crypto';

export async function closeCommand(ctx: BotContext, redis: Redis) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const args = (ctx.message as any)?.text?.split(' ').slice(1) ?? [];
  if (!args[0]) {
    return ctx.reply('Usage: /close <position_id>\nGet position IDs from /positions');
  }

  const positionIdPrefix = args[0].trim();

  // Find position by partial ID prefix
  const position = await prisma.position.findFirst({
    where: {
      userId,
      isOpen: true,
      id: { startsWith: positionIdPrefix },
    },
  });

  if (!position) {
    return ctx.reply(`Position not found: ${positionIdPrefix}\nCheck /positions for your open positions.`);
  }

  const chatId = String(ctx.chat?.id ?? ctx.from?.id);

  const queue = new Queue(QUEUE_NAMES.TRADE_QUEUE, { connection: redis as any });
  await queue.add(
    'close-position',
    {
      jobId: randomUUID(),
      userId,
      telegramChatId: chatId,
      positionId: position.id,
      market: position.market,
    },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
  );
  await queue.close();

  await ctx.reply(
    `🔄 Closing position...\n\nMarket: ${position.market}\nSide: ${position.side}\nSize: ${Number(position.size).toFixed(4)}\n\nYou'll be notified when closed.`,
  );
}
