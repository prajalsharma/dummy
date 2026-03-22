import { BotContext } from '../types';

export async function helpCommand(ctx: BotContext) {
  await ctx.replyWithMarkdownV2(
    `📖 *RISEx Trading Bot — Commands*

*Account*
/start — Start the bot & view wallet
/deposit — Get deposit address
/balance — Check your balance
/invite — Invite friends & earn rewards

*Trading*
/markets — View available markets
/long <pair> <margin> <leverage> — Open long
/short <pair> <margin> <leverage> — Open short
/positions — View open positions
/close <position\\_id> — Close a position

*Social*
/leaderboard — View top traders

*Examples*
\`/long BTC 100 10\` — Long BTC with $100 margin at 10x
\`/short ETH 50 5\` — Short ETH with $50 margin at 5x
\`/close abc12345\` — Close position by ID prefix

*Limits*
• Max leverage: 100x
• Rate limit: 20 commands/minute

Need help? Visit our dashboard for more features\\.`,
  );
}
