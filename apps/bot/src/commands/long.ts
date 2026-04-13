import { BotContext } from '../types';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, RATE_LIMITS, REDIS_CHANNELS, TradeJob } from '@risex/shared';
import { prisma } from '@risex/database';
import { randomUUID } from 'crypto';

export async function longCommand(ctx: BotContext, redis: Redis) {
  await placeTradeCommand(ctx, redis, 'long');
}

export async function placeTradeCommand(
  ctx: BotContext,
  redis: Redis,
  side: 'long' | 'short',
) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  // Per-user trade rate limit
  const tradeKey = `ratelimit:trade:${userId}`;
  const tradeCount = await redis.incr(tradeKey);
  if (tradeCount === 1) await redis.expire(tradeKey, 60);
  if (tradeCount > RATE_LIMITS.TRADE_PER_MIN) {
    return ctx.reply('⚠️ Too many trade requests. Please wait before placing another order.');
  }

  const args = (ctx.message as any)?.text?.split(' ').slice(1) ?? [];
  if (args.length < 2) {
    const emoji = side === 'long' ? '📈' : '📉';
    return ctx.replyWithMarkdownV2(
      `${emoji} *Open ${side.charAt(0).toUpperCase() + side.slice(1)} Position*\n\nUsage: \`/${side} <pair> <margin_usdc> [leverage]\`\n\nExamples:\n\`/${side} BTC 100 10\` — $100 margin, 10x\n\`/${side} ETH 50 25\` — $50 margin, 25x\n\`/${side} SOL 200 5\` — $200 margin, 5x\n\nMax leverage: 100x`,
    );
  }

  const [market, marginStr, leverageStr] = args;
  const marginUSDC = parseFloat(marginStr);
  const leverage = leverageStr ? parseInt(leverageStr, 10) : 10;

  if (isNaN(marginUSDC) || marginUSDC <= 0 || marginUSDC > 1_000_000) {
    return ctx.reply('Invalid margin amount. Must be a positive number (max 1,000,000).');
  }
  if (isNaN(leverage) || leverage < 1 || leverage > 100) {
    return ctx.reply('Invalid leverage. Must be between 1 and 100.');
  }

  // Sanitize market symbol
  const cleanMarket = market.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!cleanMarket) {
    return ctx.reply('Invalid market symbol.');
  }

  const wallet = await prisma.wallet.findFirst({ where: { userId, isActive: true } });
  if (!wallet) {
    return ctx.reply('No wallet linked. Use /deposit to get started.');
  }

  const chatId = String(ctx.chat?.id ?? ctx.from?.id);
  const jobId = randomUUID();

  const job: TradeJob = {
    jobId,
    userId,
    telegramChatId: chatId,
    request: {
      userId,
      market: cleanMarket,
      side,
      type: 'market',
      marginUSDC,
      leverage,
    },
    createdAt: Date.now(),
  };

  const queue = new Queue(QUEUE_NAMES.TRADE_QUEUE, { connection: redis as any });
  await queue.add('place-order', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
  await queue.close();

  // Broadcast to social feed channel
  const firstName = ctx.from?.first_name || 'Trader';
  const username = ctx.from?.username ? `@${ctx.from.username}` : firstName;
  await redis.publish(
    REDIS_CHANNELS.TRADE_BROADCAST,
    JSON.stringify({
      type: 'trade_opened',
      username,
      market: cleanMarket,
      side,
      marginUSDC,
      leverage,
      notional: marginUSDC * leverage,
      timestamp: Date.now(),
    }),
  );

  const emoji = side === 'long' ? '📈' : '📉';
  const leverageWarning = leverage >= 50 ? '\n⚠️ High leverage — consider setting a /sl stop loss.' : '';

  await ctx.replyWithMarkdownV2(
    `${emoji} *${side.toUpperCase()} Order Queued\\!*\n\nMarket: ${cleanMarket}\nMargin: $${marginUSDC}\nLeverage: ${leverage}x\nNotional: $${(marginUSDC * leverage).toLocaleString()}\n${leverageWarning}\nYou'll be notified when filled\\. Use /positions to track\\.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 View Positions', callback_data: 'cmd_positions' },
            { text: '💰 Check Balance', callback_data: 'cmd_balance' },
          ],
        ],
      },
    },
  );
}
