import { Telegraf } from 'telegraf';
import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@risex/shared';
import { BotContext } from '../types';
import { logger } from '../logger';

export class NotificationService {
  private subscriber: Redis;
  private bot: Telegraf<BotContext>;

  constructor(bot: Telegraf<BotContext>, redis: Redis) {
    this.bot = bot;
    this.subscriber = redis.duplicate();
  }

  async start() {
    await this.subscriber.subscribe(
      REDIS_CHANNELS.TRADE_RESULTS,
      REDIS_CHANNELS.LIQUIDATION_ALERTS,
      REDIS_CHANNELS.POSITION_UPDATES,
      REDIS_CHANNELS.TP_SL_HIT,
      REDIS_CHANNELS.DEPOSIT_ALERTS,
    );

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message).catch((err) =>
        logger.error('Notification handler error', { err, channel }),
      );
    });

    logger.info('Notification service started');
  }

  private async handleMessage(channel: string, raw: string) {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const chatId = data.telegramChatId;
    if (!chatId) return;

    switch (channel) {
      case REDIS_CHANNELS.TRADE_RESULTS:
        await this.sendTradeResult(chatId, data);
        break;
      case REDIS_CHANNELS.LIQUIDATION_ALERTS:
        await this.sendLiquidationAlert(chatId, data);
        break;
      case REDIS_CHANNELS.POSITION_UPDATES:
        await this.sendPositionUpdate(chatId, data);
        break;
      case REDIS_CHANNELS.TP_SL_HIT:
        await this.sendTpSlHit(chatId, data);
        break;
      case REDIS_CHANNELS.DEPOSIT_ALERTS:
        await this.sendDepositAlert(chatId, data);
        break;
    }
  }

  private async sendTradeResult(chatId: string, data: any) {
    if (data.success) {
      await this.bot.telegram.sendMessage(
        chatId,
        `✅ Order Filled!\n\nMarket: ${data.market}\nSide: ${data.side?.toUpperCase()}\nSize: ${data.size}\nEntry Price: $${data.entryPrice?.toLocaleString()}\nMargin: $${data.marginUSDC}\nLeverage: ${data.leverage}x\n\nPosition ID: ${data.positionId?.slice(0, 8)}`,
      );
    } else {
      await this.bot.telegram.sendMessage(
        chatId,
        `❌ Order Failed\n\n${data.error || 'Unknown error. Please try again.'}`,
      );
    }
  }

  private async sendLiquidationAlert(chatId: string, data: any) {
    await this.bot.telegram.sendMessage(
      chatId,
      `⚠️ LIQUIDATION ALERT\n\nYour ${data.market} ${data.side} position has been liquidated.\n\nLoss: -$${Math.abs(data.loss || 0).toFixed(2)}\n\nConsider using lower leverage to avoid liquidations.`,
    );
  }

  private async sendPositionUpdate(chatId: string, data: any) {
    const pnlEmoji = data.pnl >= 0 ? '📈' : '📉';
    await this.bot.telegram.sendMessage(
      chatId,
      `${pnlEmoji} Position Update\n\n${data.market} ${data.side}\nUnrealized PnL: ${data.pnl >= 0 ? '+' : ''}$${data.pnl?.toFixed(2)}\nMark Price: $${data.markPrice?.toLocaleString()}`,
    );
  }

  private async sendTpSlHit(chatId: string, data: any) {
    const isTp = data.triggerType === 'tp';
    const pnl = data.pnl ?? 0;
    const pnlSign = pnl >= 0 ? '+' : '';
    const emoji = isTp ? '🎯' : '🛡️';
    const label = isTp ? 'Take Profit Hit' : 'Stop Loss Hit';

    const message =
      `${emoji} *${label}\\!*\n\n` +
      `Market: ${data.market} ${data.side}\n` +
      `Trigger Price: \\$${Number(data.triggerPrice).toLocaleString()}\n` +
      `Mark Price: \\$${Number(data.markPrice).toLocaleString()}\n` +
      `Entry Price: \\$${Number(data.entryPrice).toLocaleString()}\n` +
      `PnL: ${pnlSign}\\$${Math.abs(pnl).toFixed(2)}\n\n` +
      `_Position will be closed automatically\\._`;

    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 Positions', callback_data: 'cmd_positions' },
            { text: '📉 PnL', callback_data: 'cmd_pnl' },
          ],
        ],
      },
    });
  }

  private async sendDepositAlert(chatId: string, data: any) {
    const amount = Number(data.amount || 0).toFixed(2);
    const txShort = data.txHash ? `${data.txHash.slice(0, 10)}...` : 'N/A';
    await this.bot.telegram.sendMessage(
      chatId,
      `💸 Deposit Received!\n\nAmount: $${amount} USDC\nTx: ${txShort}\n\nYour balance is now available for trading.\nUse /balance to confirm or /long to start trading!`,
    );
  }

  async stop() {
    await this.subscriber.unsubscribe();
    await this.subscriber.quit();
  }
}
