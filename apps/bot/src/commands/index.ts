import { Telegraf } from 'telegraf';
import { Redis } from 'ioredis';
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
