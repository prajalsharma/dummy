import { BotContext } from '../types';
import { prisma } from '@risex/database';

export async function tpCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const args = (ctx.message as any)?.text?.split(' ').slice(1) ?? [];
  if (args.length < 2) {
    return ctx.replyWithMarkdownV2(
      `*Set Take Profit*\n\nUsage: \`/tp <position_id> <price>\`\n\nExample: \`/tp abc123 72000\`\n\nUse /positions to see your position IDs\\.`,
    );
  }

  const [posId, priceStr] = args;
  const takeProfitPrice = parseFloat(priceStr);

  if (isNaN(takeProfitPrice) || takeProfitPrice <= 0) {
    return ctx.reply('Invalid price. Must be a positive number.');
  }

  const position = await prisma.position.findFirst({
    where: { id: { startsWith: posId }, userId, isOpen: true },
  });

  if (!position) {
    return ctx.reply(`Position not found: ${posId}\n\nUse /positions to see your open positions.`);
  }

  const entryPrice = Number(position.entryPrice);
  if (position.side === 'LONG' && takeProfitPrice <= entryPrice) {
    return ctx.reply(`⚠️ Take profit must be above entry price ($${entryPrice.toLocaleString()}) for a LONG position.`);
  }
  if (position.side === 'SHORT' && takeProfitPrice >= entryPrice) {
    return ctx.reply(`⚠️ Take profit must be below entry price ($${entryPrice.toLocaleString()}) for a SHORT position.`);
  }

  await prisma.position.update({
    where: { id: position.id },
    data: { takeProfitPrice },
  });

  const potentialPnl =
    position.side === 'LONG'
      ? Number(position.size) * (takeProfitPrice - entryPrice)
      : Number(position.size) * (entryPrice - takeProfitPrice);

  await ctx.replyWithMarkdownV2(
    `✅ *Take Profit Set*\n\nMarket: ${position.market}\nSide: ${position.side}\nEntry: $${entryPrice.toLocaleString()}\nTP Price: $${takeProfitPrice.toLocaleString()}\nPotential Profit: \\+$${potentialPnl.toFixed(2)}\n\nYou'll be notified when TP is triggered\\.`,
  );
}
