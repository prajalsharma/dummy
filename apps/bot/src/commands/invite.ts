import { BotContext } from '../types';
import { prisma } from '@risex/database';

export async function inviteCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { referrals: true } },
    },
  });

  if (!user) return ctx.reply('User not found. Please /start again.');

  const botUsername = ctx.botInfo?.username;
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

  await ctx.replyWithMarkdownV2(
    `🎁 *Invite Friends & Earn*

Your referral code: \`${user.referralCode}\`

Share your invite link:
\`${inviteLink}\`

You've invited *${user._count.referrals}* friend${user._count.referrals === 1 ? '' : 's'} so far\\.

Earn rewards when your friends trade\\!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Share Invite Link', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join me on RISEx Trading Bot!')}` }],
        ],
      },
    },
  );
}
