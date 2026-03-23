import { BotContext } from '../types';
import { prisma } from '@risex/database';
import { formatUSDC } from '@risex/shared';
import { RisexApiClient } from '../services/risexApi';

export async function balanceCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) return ctx.reply('Please /start first.');

  await ctx.reply('Fetching balance...');

  const wallet = await prisma.wallet.findFirst({ where: { userId, isActive: true } });
  if (!wallet) {
    return ctx.reply('No wallet linked. Use /deposit to get started.');
  }

  try {
    const api = new RisexApiClient();
    const balance = await api.getBalance(wallet.address);

    const openPositions = await prisma.position.count({
      where: { userId, isOpen: true },
    });

    await ctx.replyWithMarkdownV2(
      `💰 *Your Balance*

*Available:* \`${formatUSDC(balance.available)}\`
*In Positions:* \`${formatUSDC(balance.inPositions)}\`
*Total Equity:* \`${formatUSDC(balance.equity)}\`
*Unrealized PnL:* \`${formatUSDC(balance.unrealizedPnl)}\`

📊 Open Positions: ${openPositions}
🔗 Wallet: \`${wallet.address}\``,
    );
  } catch {
    await ctx.reply('Unable to fetch balance. Please try again shortly.');
  }
}
