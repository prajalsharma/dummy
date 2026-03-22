import { BotContext } from '../types';
import { prisma } from '@risex/database';
import { formatUSDC, formatPercent } from '@risex/shared';

export async function leaderboardCommand(ctx: BotContext) {
  const entries = await prisma.leaderboardEntry.findMany({
    orderBy: { totalPnl: 'desc' },
    take: 10,
    include: {
      user: {
        include: { telegramAccount: true },
      },
    },
  });

  if (!entries.length) {
    return ctx.reply('🏆 Leaderboard is empty. Be the first to trade!');
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((e: any, i: number) => {
    const medal = medals[i] || `${i + 1}.`;
    const name =
      e.user.telegramAccount?.username
        ? `@${e.user.telegramAccount.username}`
        : e.user.telegramAccount?.firstName || 'Anonymous';
    const winRate = formatPercent(Number(e.winRate) * 100);
    return `${medal} *${name}*\n   PnL: \`${formatUSDC(Number(e.totalPnl))}\` | Win Rate: \`${winRate}\` | Trades: \`${e.tradeCount}\``;
  });

  await ctx.replyWithMarkdownV2(
    `🏆 *Top Traders — All Time*\n\n${lines.join('\n\n')}`,
  );
}
