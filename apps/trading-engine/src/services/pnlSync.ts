import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { prisma } from '@risex/database';
import { REDIS_CHANNELS, QUEUE_NAMES, calculateUnrealizedPnl } from '@risex/shared';
import { RisexTradingClient } from './risexTrading';
import { logger } from '../logger';

export class PnlSyncService {
  private redis: Redis;
  private publisher: Redis;
  private interval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds

  constructor(redis: Redis) {
    this.redis = redis;
    this.publisher = redis.duplicate();
  }

  async start() {
    this.interval = setInterval(() => {
      this.syncPnl().catch((err) =>
        logger.error('PnL sync error', { err }),
      );
    }, this.SYNC_INTERVAL_MS);

    logger.info('PnL sync service started');
  }

  private async syncPnl() {
    const client = new RisexTradingClient();
    let markets: any[] = [];

    try {
      markets = await client.getMarkets();
    } catch {
      return;
    }

    const priceMap = new Map<string, number>(
      markets.map((m) => [m.symbol, m.markPrice]),
    );

    // Upsert MarketCache DB table so API routes have fresh data
    for (const m of markets) {
      try {
        await prisma.marketCache.upsert({
          where: { symbol: m.symbol },
          update: {
            markPrice: m.markPrice,
            indexPrice: m.indexPrice,
            fundingRate: m.fundingRate,
            openInterest: m.openInterest,
            volume24h: m.volume24h,
            change24h: m.change24h,
            maxLeverage: m.maxLeverage,
          },
          create: {
            symbol: m.symbol,
            baseAsset: m.baseAsset,
            quoteAsset: m.quoteAsset,
            markPrice: m.markPrice,
            indexPrice: m.indexPrice,
            fundingRate: m.fundingRate,
            openInterest: m.openInterest,
            volume24h: m.volume24h,
            change24h: m.change24h,
            maxLeverage: m.maxLeverage,
          },
        });
      } catch (err) {
        logger.error('MarketCache upsert failed', { symbol: m.symbol, err });
      }
    }

    // Fetch all open positions with user telegram info for TP/SL notifications
    const positions = await prisma.position.findMany({
      where: { isOpen: true },
      take: 1000,
      include: {
        user: { include: { telegramAccount: { select: { chatId: true } } } },
      },
    });

    // Group unrealized PnL per user for leaderboard update
    const userUnrealizedPnl = new Map<string, number>();

    for (const pos of positions) {
      const markPrice = priceMap.get(pos.market);
      if (!markPrice) continue;

      const unrealizedPnl = calculateUnrealizedPnl(
        pos.side === 'LONG' ? 'long' : 'short',
        Number(pos.size),
        Number(pos.entryPrice),
        markPrice,
      );

      await prisma.position.update({
        where: { id: pos.id },
        data: { markPrice, unrealizedPnl },
      });

      userUnrealizedPnl.set(
        pos.userId,
        (userUnrealizedPnl.get(pos.userId) ?? 0) + unrealizedPnl,
      );

      // TP/SL trigger detection
      const chatId = (pos as any).user?.telegramAccount?.chatId;

      const tp = pos.takeProfitPrice ? Number(pos.takeProfitPrice) : null;
      const sl = pos.stopLossPrice ? Number(pos.stopLossPrice) : null;

      const tpHit =
        tp !== null &&
        ((pos.side === 'LONG' && markPrice >= tp) ||
          (pos.side === 'SHORT' && markPrice <= tp));

      const slHit =
        sl !== null &&
        ((pos.side === 'LONG' && markPrice <= sl) ||
          (pos.side === 'SHORT' && markPrice >= sl));

      if (tpHit || slHit) {
        const triggerType = tpHit ? 'tp' : 'sl';
        const triggerPrice = tpHit ? tp! : sl!;
        const pnl =
          pos.side === 'LONG'
            ? Number(pos.size) * (markPrice - Number(pos.entryPrice))
            : Number(pos.size) * (Number(pos.entryPrice) - markPrice);

        logger.info('TP/SL triggered — queuing auto-close', { positionId: pos.id, triggerType, markPrice, triggerPrice });

        // Clear TP/SL fields immediately to prevent re-triggering on next sync cycle
        await prisma.position.update({
          where: { id: pos.id },
          data: { takeProfitPrice: null, stopLossPrice: null },
        });

        // Notify user
        if (chatId) {
          await this.publisher.publish(
            REDIS_CHANNELS.TP_SL_HIT,
            JSON.stringify({
              telegramChatId: chatId,
              positionId: pos.id,
              userId: pos.userId,
              market: pos.market,
              side: pos.side,
              triggerType,
              triggerPrice,
              markPrice,
              entryPrice: Number(pos.entryPrice),
              size: Number(pos.size),
              leverage: pos.leverage,
              pnl,
            }),
          );
        }

        // Auto-close: queue a close-position job to the trade worker
        const closeQueue = new Queue(QUEUE_NAMES.TRADE_QUEUE, {
          connection: this.redis as any,
        });
        await closeQueue.add(
          'close-position',
          {
            userId: pos.userId,
            telegramChatId: chatId ?? '',
            positionId: pos.id,
            market: pos.market,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
        );
        await closeQueue.close();
      }
    }

    // Update leaderboard with realizedPnl + current unrealizedPnl
    for (const [userId, unrealizedPnl] of userUnrealizedPnl.entries()) {
      const lb = await prisma.leaderboardEntry.findUnique({ where: { userId } });
      if (!lb) continue;
      await prisma.leaderboardEntry.update({
        where: { userId },
        data: { totalPnl: Number(lb.realizedPnl) + unrealizedPnl },
      });
    }

    // Cache prices in Redis
    for (const [symbol, price] of priceMap.entries()) {
      await this.redis.setex(`price:${symbol}`, 30, String(price));
    }

    // Publish price updates
    await this.publisher.publish(
      REDIS_CHANNELS.PRICE_UPDATES,
      JSON.stringify({ prices: Object.fromEntries(priceMap), timestamp: Date.now() }),
    );

    logger.debug('PnL sync complete', { positions: positions.length, markets: markets.length });
  }

  async stop() {
    if (this.interval) clearInterval(this.interval);
    await this.publisher.quit();
  }
}
