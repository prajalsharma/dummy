import { BotContext } from '../types';
import { prisma } from '@risex/database';

export async function slCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const args = (ctx.message as any)?.text?.split(' ').slice(1) ?? [];
  if (args.length < 2) {
    return ctx.replyWithMarkdownV2(
      `*Set Stop Loss*\n\nUsage: \`/sl <position_id> <price>\`\n\nExample: \`/sl abc123 60000\`\n\nUse /positions to see your position IDs\\.`,
    );
  }

  const [posId, priceStr] = args;
  const stopLossPrice = parseFloat(priceStr);

  if (isNaN(stopLossPrice) || stopLossPrice <= 0) {
    return ctx.reply('Invalid price. Must be a positive number.');
  }

  const position = await prisma.position.findFirst({
    where: { id: { startsWith: posId }, userId, isOpen: true },
  });

  if (!position) {
    return ctx.reply(`Position not found: ${posId}\n\nUse /positions to see your open positions.`);
  }

  const entryPrice = Number(position.entryPrice);
  const liqPrice = Number(position.liquidationPrice ?? 0);

  if (position.side === 'LONG' && stopLossPrice >= entryPrice) {
    return ctx.reply(`⚠️ Stop loss must be below entry price ($${entryPrice.toLocaleString()}) for a LONG position.`);
  }
  if (position.side === 'SHORT' && stopLossPrice <= entryPrice) {
    return ctx.reply(`⚠️ Stop loss must be above entry price ($${entryPrice.toLocaleString()}) for a SHORT position.`);
  }
  if (liqPrice > 0 && position.side === 'LONG' && stopLossPrice <= liqPrice) {
    return ctx.reply(`⚠️ Stop loss ($${stopLossPrice.toLocaleString()}) must be above liquidation price ($${liqPrice.toLocaleString()}).`);
  }
  if (liqPrice > 0 && position.side === 'SHORT' && stopLossPrice >= liqPrice) {
    return ctx.reply(`⚠️ Stop loss ($${stopLossPrice.toLocaleString()}) must be below liquidation price ($${liqPrice.toLocaleString()}).`);
  }

  await prisma.position.update({
    where: { id: position.id },
    data: { stopLossPrice },
  });

  const maxLoss =
    position.side === 'LONG'
      ? Number(position.size) * (entryPrice - stopLossPrice)
      : Number(position.size) * (stopLossPrice - entryPrice);

  await ctx.replyWithMarkdownV2(
    `🛡️ *Stop Loss Set*\n\nMarket: ${position.market}\nSide: ${position.side}\nEntry: $${entryPrice.toLocaleString()}\nSL Price: $${stopLossPrice.toLocaleString()}\nMax Loss: \\-$${maxLoss.toFixed(2)}\n${liqPrice > 0 ? `Liq Price: $${liqPrice.toLocaleString()}\n` : ''}\nYou'll be notified when SL is triggered\\.`,
  );
}
