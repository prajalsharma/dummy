import { MiddlewareFn } from 'telegraf';
import { prisma } from '@risex/database';
import { generateReferralCode } from '@risex/shared';
import { BotContext } from '../types';
import { logger } from '../logger';

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) return next();

  try {
    // Upsert TelegramAccount and resolve User
    let resolvedUserId: string | undefined;

    const existingAccount = await prisma.telegramAccount.findUnique({
      where: { telegramId: String(from.id) },
      include: { user: true },
    });

    if (!existingAccount) {
      // Create new user + telegram account in one transaction
      const user = await prisma.user.create({
        data: {
          referralCode: generateReferralCode(),
          telegramAccount: {
            create: {
              telegramId: String(from.id),
              username: from.username,
              firstName: from.first_name,
              lastName: from.last_name,
              chatId: String(ctx.chat?.id ?? from.id),
            },
          },
          leaderboard: {
            create: {},
          },
        },
        include: { telegramAccount: true },
      });

      resolvedUserId = user.id;
      logger.info('New user registered', { telegramId: from.id, userId: user.id });
    } else {
      // Update last active
      await prisma.telegramAccount.update({
        where: { id: existingAccount.id },
        data: { lastActiveAt: new Date(), username: from.username },
      });
      resolvedUserId = existingAccount.user.id;
    }

    // Attach to session
    ctx.session.userId = resolvedUserId;
    ctx.session.walletAddress = undefined;
  } catch (err) {
    logger.error('Auth middleware error', { err });
  }

  return next();
};
