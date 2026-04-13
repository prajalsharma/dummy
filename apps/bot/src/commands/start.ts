import { BotContext } from '../types';
import { prisma } from '@risex/database';
import { truncateAddress } from '@risex/shared';

function escMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export async function startCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  const firstName = ctx.from?.first_name || 'Trader';
  const args = (ctx.message as any)?.text?.split(' ').slice(1) ?? [];
  const referralCode = args[0] ?? null;

  // Handle referral link
  if (referralCode && userId) {
    try {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer && referrer.id !== userId) {
        const me = await prisma.user.findUnique({ where: { id: userId } });
        if (me && !me.referredById) {
          await prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } });
          await prisma.referral.upsert({
            where: { referrerId_referredId: { referrerId: referrer.id, referredId: userId } },
            update: {},
            create: { referrerId: referrer.id, referredId: userId },
          });
        }
      }
    } catch { /* ignore referral errors */ }
  }

  const wallet = userId
    ? await prisma.wallet.findFirst({ where: { userId, isActive: true } })
    : null;

  const leaderboard = userId
    ? await prisma.leaderboardEntry.findUnique({ where: { userId } })
    : null;

  // New user — full onboarding flow
  if (!wallet) {
    await ctx.replyWithMarkdownV2(
      `🚀 *Welcome to RISEx, ${escMd(firstName)}\\!*

Trade perps on Risechain with up to 100x leverage — directly from Telegram\\.

*🔥 Why RISEx?*
• ⚡ Lightning\\-fast order fills on Risechain
• 💸 Trade from $1 margin, up to 100x leverage
• 🏆 Compete on the global leaderboard
• 👥 Share your wins with the community
• 🛡️ TP\\/SL to protect your positions

*📋 Getting Started:*
1️⃣ /deposit — create your trading wallet
2️⃣ Fund it with USDC on Risechain testnet
3️⃣ \`/long BTC 100 10\` — place your first trade
4️⃣ \`/tp <id> <price>\` — set take profit

Type /help for all commands\\.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💳 Get Started → Deposit', callback_data: 'cmd_deposit' },
            ],
            [
              { text: '📈 Markets', callback_data: 'cmd_markets' },
              { text: '🏆 Leaderboard', callback_data: 'cmd_leaderboard' },
            ],
          ],
        },
      },
    );
    return;
  }

  // Returning user — personalised dashboard
  const tradeCount = leaderboard?.tradeCount ?? 0;
  const totalPnl = Number(leaderboard?.totalPnl ?? 0);
  const pnlEmoji = totalPnl >= 0 ? '📈' : '📉';
  const pnlSign = totalPnl >= 0 ? '\\+' : '\\-';
  const pnlAbs = Math.abs(totalPnl).toFixed(2);
  const winCount = leaderboard?.winCount ?? 0;
  const winRate = tradeCount > 0 ? ((winCount / tradeCount) * 100).toFixed(0) : '0';

  const statusLine =
    tradeCount === 0
      ? '_No trades yet — place your first one\\!_'
      : `${pnlEmoji} PnL: ${pnlSign}$${pnlAbs} \\| ${winRate}% win rate \\| ${tradeCount} trades`;

  await ctx.replyWithMarkdownV2(
    `👋 *Welcome back, ${escMd(firstName)}\\!*

💼 Wallet: \`${truncateAddress(wallet.address)}\`
${statusLine}

*Quick Trade:*
\`/long BTC 100 10\` — 100 USDC long, 10x
\`/short ETH 50 5\` — 50 USDC short, 5x

*Manage Risk:*
\`/positions\` → \`/tp <id> <price>\` → \`/sl <id> <price>\`
\`/pnl\` — full PnL breakdown`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 Positions', callback_data: 'cmd_positions' },
            { text: '💰 Balance', callback_data: 'cmd_balance' },
          ],
          [
            { text: '📈 Markets', callback_data: 'cmd_markets' },
            { text: '🏆 Leaderboard', callback_data: 'cmd_leaderboard' },
          ],
          [
            { text: '📉 PnL', callback_data: 'cmd_pnl' },
            { text: '🔗 Invite & Earn', callback_data: 'cmd_invite' },
          ],
        ],
      },
    },
  );
}
