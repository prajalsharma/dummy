import { BotContext } from '../types';
import { prisma } from '@risex/database';

function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export async function pnlCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const [openPositions, closedPositions, leaderboard] = await Promise.all([
    prisma.position.findMany({
      where: { userId, isOpen: true },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.position.findMany({
      where: { userId, isOpen: false, realizedPnl: { not: null } },
      orderBy: { closedAt: 'desc' },
      take: 5,
    }),
    prisma.leaderboardEntry.findUnique({ where: { userId } }),
  ]);

  const totalUnrealized = openPositions.reduce(
    (sum: number, p: any) => sum + Number(p.unrealizedPnl ?? 0),
    0,
  );
  const totalRealized = Number(leaderboard?.realizedPnl ?? 0);
  const totalPnl = totalRealized + totalUnrealized;
  const tradeCount = leaderboard?.tradeCount ?? 0;
  const winCount = leaderboard?.winCount ?? 0;
  const winRate = tradeCount > 0 ? ((winCount / tradeCount) * 100).toFixed(1) : '0.0';

  const totalPnlStr = escMd(`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`);
  const realizedStr = escMd(`${totalRealized >= 0 ? '+' : ''}$${totalRealized.toFixed(2)}`);
  const unrealizedStr = escMd(`${totalUnrealized >= 0 ? '+' : ''}$${totalUnrealized.toFixed(2)}`);
  const winRateStr = escMd(`${winRate}%`);

  let message = `📊 *Your PnL Summary*\n\n`;
  message += `💰 Total PnL: ${totalPnlStr}\n`;
  message += `✅ Realized: ${realizedStr}\n`;
  message += `🔄 Unrealized: ${unrealizedStr}\n`;
  message += `📈 Win Rate: ${winRateStr} \\(${winCount}/${tradeCount} trades\\)\n`;

  if (openPositions.length > 0) {
    message += `\n*Open Positions \\(${openPositions.length}\\):*\n`;
    for (const pos of openPositions.slice(0, 3) as any[]) {
      const pnl = Number(pos.unrealizedPnl ?? 0);
      const pnlEmoji = pnl >= 0 ? '📈' : '📉';
      const pnlStr = escMd(`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
      message += `${pnlEmoji} ${escMd(pos.market)} ${pos.side} ${pos.leverage}x → ${pnlStr}\n`;
    }
    if (openPositions.length > 3) {
      message += `_\\+${openPositions.length - 3} more…_\n`;
    }
  }

  if (closedPositions.length > 0) {
    message += `\n*Recent Closed:*\n`;
    for (const pos of closedPositions.slice(0, 3) as any[]) {
      const pnl = Number(pos.realizedPnl ?? 0);
      const pnlEmoji = pnl >= 0 ? '✅' : '❌';
      const pnlStr = escMd(`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
      message += `${pnlEmoji} ${escMd(pos.market)} ${pos.side} → ${pnlStr}\n`;
    }
  }

  await ctx.replyWithMarkdownV2(message);
}
