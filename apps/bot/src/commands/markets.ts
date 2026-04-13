import { BotContext } from '../types';
import { RisexApiClient } from '../services/risexApi';
import { formatUSDC, formatPercent } from '@risex/shared';

export async function marketsCommand(ctx: BotContext) {
  try {
    const api = new RisexApiClient();
    const markets = await api.getMarkets();

    if (!markets.length) {
      return ctx.reply('No markets available at the moment.');
    }

    const lines = markets.slice(0, 10).map((m) => {
      const changeEmoji = m.change24h >= 0 ? '🟢' : '🔴';
      return `${changeEmoji} *${m.symbol}* — $${m.markPrice.toLocaleString()}\n   ${formatPercent(m.change24h)} | Vol: ${formatUSDC(m.volume24h)} | Max ${m.maxLeverage}x`;
    });

    await ctx.replyWithMarkdownV2(
      `📈 *Available Markets*\n\n${lines.join('\n\n')}\n\n_Use /long or /short to trade_`,
    );
  } catch {
    await ctx.reply('Unable to fetch markets. Please try again.');
  }
}
