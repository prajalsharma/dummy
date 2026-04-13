import { Telegraf } from 'telegraf';
import { Redis } from 'ioredis';
import { prisma } from '@risex/database';
import { BotContext } from '../types';
import { startCommand } from './start';
import { depositCommand } from './deposit';
import { balanceCommand } from './balance';
import { marketsCommand } from './markets';
import { longCommand } from './long';
import { shortCommand } from './short';
import { positionsCommand } from './positions';
import { closeCommand } from './close';
import { leaderboardCommand } from './leaderboard';
import { inviteCommand } from './invite';
import { helpCommand } from './help';
import { tpCommand } from './tp';
import { slCommand } from './sl';
import { pnlCommand } from './pnl';

export function setupCommands(bot: Telegraf<BotContext>, redis: Redis) {
  bot.command('start', startCommand);
  bot.command('deposit', depositCommand);
  bot.command('balance', balanceCommand);
  bot.command('markets', marketsCommand);
  bot.command('long', (ctx) => longCommand(ctx, redis));
  bot.command('short', (ctx) => shortCommand(ctx, redis));
  bot.command('positions', positionsCommand);
  bot.command('close', (ctx) => closeCommand(ctx, redis));
  bot.command('leaderboard', leaderboardCommand);
  bot.command('invite', inviteCommand);
  bot.command('help', helpCommand);
  bot.command('tp', tpCommand);
  bot.command('sl', slCommand);
  bot.command('pnl', pnlCommand);

  // Inline keyboard callback actions — each maps to the corresponding command handler
  bot.action('cmd_start', async (ctx) => { await ctx.answerCbQuery(); await startCommand(ctx); });
  bot.action('cmd_deposit', async (ctx) => { await ctx.answerCbQuery(); await depositCommand(ctx); });
  bot.action('cmd_balance', async (ctx) => { await ctx.answerCbQuery(); await balanceCommand(ctx); });
  bot.action('cmd_markets', async (ctx) => { await ctx.answerCbQuery(); await marketsCommand(ctx); });
  bot.action('cmd_positions', async (ctx) => { await ctx.answerCbQuery(); await positionsCommand(ctx); });
  bot.action('cmd_leaderboard', async (ctx) => { await ctx.answerCbQuery(); await leaderboardCommand(ctx); });
  bot.action('cmd_invite', async (ctx) => { await ctx.answerCbQuery(); await inviteCommand(ctx); });
  bot.action('cmd_help', async (ctx) => { await ctx.answerCbQuery(); await helpCommand(ctx); });
  bot.action('cmd_pnl', async (ctx) => { await ctx.answerCbQuery(); await pnlCommand(ctx); });

  // Text handler: link wallet address when user is in 'link_wallet' pending action
  bot.on('text', async (ctx, next) => {
    const text = (ctx.message as any)?.text as string | undefined;
    if (!text || text.startsWith('/')) return next();

    if (ctx.session?.pendingAction === 'link_wallet') {
      const address = text.trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        await ctx.reply('⚠️ Invalid address format. Please send a valid Risechain address (0x followed by 40 hex characters).');
        return;
      }

      const userId = ctx.session.userId;
      if (!userId) {
        await ctx.reply('Session expired. Please /start again.');
        return;
      }

      // Upsert wallet — deactivate existing first, then create new
      await prisma.wallet.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
      await prisma.wallet.upsert({
        where: { address: address.toLowerCase() },
        update: { userId, isActive: true },
        create: { userId, address: address.toLowerCase(), isActive: true },
      });

      ctx.session.pendingAction = undefined;

      await ctx.replyWithMarkdownV2(
        `✅ *Wallet Linked\\!*\n\n\`${address.toLowerCase()}\`\n\nYou can now deposit USDC on Risechain and start trading\\.\nUse /balance to check your balance or /markets to see available markets\\.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💰 Check Balance', callback_data: 'cmd_balance' },
                { text: '📈 Markets', callback_data: 'cmd_markets' },
              ],
            ],
          },
        },
      );
      return;
    }

    return next();
  });

  // Set bot commands for menu
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'deposit', description: 'Deposit funds' },
    { command: 'balance', description: 'Check your balance' },
    { command: 'markets', description: 'View available markets' },
    { command: 'long', description: 'Open a long position' },
    { command: 'short', description: 'Open a short position' },
    { command: 'positions', description: 'View open positions' },
    { command: 'close', description: 'Close a position' },
    { command: 'tp', description: 'Set take profit on a position' },
    { command: 'sl', description: 'Set stop loss on a position' },
    { command: 'pnl', description: 'View your PnL summary' },
    { command: 'leaderboard', description: 'View top traders' },
    { command: 'invite', description: 'Invite friends & earn rewards' },
    { command: 'help', description: 'Show help' },
  ]);
}
