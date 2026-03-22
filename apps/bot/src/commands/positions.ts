import { BotContext } from '../types';
import { prisma } from '@risex/database';
import { formatUSDC, formatPnl } from '@risex/shared';

export async function positionsCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const positions = await prisma.position.findMany({
    where: { userId, isOpen: true },
    orderBy: { openedAt: 'desc' },
    take: 10,
  });

  if (!positions.length) {
    return ctx.reply('📊 No open positions.\n\nUse /long or /short to open a trade.');
  }

  const lines = positions.map((p: any, i: number) => {
    const side = p.side === 'LONG' ? '📈 LONG' : '📉 SHORT';
    const pnl = p.unrealizedPnl ? formatPnl(Number(p.unrealizedPnl)) : 'N/A';
    const liqPrice = p.liquidationPrice ? `$${Number(p.liquidationPrice).toLocaleString()}` : 'N/A';
    return [
      `${i + 1}\\. *${p.market}* ${side} ${p.leverage}x`,
      `   Size: \`${Number(p.size).toFixed(4)}\` | Entry: \`$${Number(p.entryPrice).toLocaleString()}\``,
      `   Margin: \`${formatUSDC(Number(p.marginUSDC))}\` | PnL: \`${pnl}\``,
      `   Liq\\. Price: \`${liqPrice}\``,
      `   ID: \`${p.id.slice(0, 8)}\``,
    ].join('\n');
  });

  await ctx.replyWithMarkdownV2(
    `📊 *Open Positions \\(${positions.length}\\)*\n\n${lines.join('\n\n')}\n\n_Use /close <id> to close a position_`,
  );
}
