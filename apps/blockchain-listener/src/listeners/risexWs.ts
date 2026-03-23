import WebSocket from 'ws';
import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@risex/shared';
import { prisma } from '@risex/database';
import { logger } from '../logger';

interface RisexWsEvent {
  type: 'fill' | 'liquidation' | 'funding' | 'price';
  data: any;
}

export class RisexWsListener {
  private wsUrl: string;
  private redis: Redis;
  private publisher: Redis;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(wsUrl: string, redis: Redis) {
    this.wsUrl = wsUrl;
    this.redis = redis;
    this.publisher = redis.duplicate();
  }

  async start() {
    this.connect();
    logger.info('RISEx WebSocket listener starting');
  }

  private connect() {
    if (this.stopped) return;

    logger.info('Connecting to RISEx WebSocket', { url: this.wsUrl });

    try {
      this.ws = new WebSocket(this.wsUrl, {
        headers: {
          'X-API-Key': process.env.RISEX_API_KEY || '',
        },
      });

      this.ws.on('open', () => {
        logger.info('RISEx WebSocket connected');
        // Subscribe to all events
        this.ws?.send(JSON.stringify({ op: 'subscribe', channels: ['fills', 'liquidations', 'prices'] }));
      });

      this.ws.on('message', (data) => {
        try {
          const event: RisexWsEvent = JSON.parse(data.toString());
          this.handleEvent(event).catch((err) =>
            logger.error('WS event handler error', { err }),
          );
        } catch {
          // ignore parse errors
        }
      });

      this.ws.on('error', (err) => {
        logger.error('RISEx WebSocket error', { err: err.message });
      });

      this.ws.on('close', () => {
        logger.warn('RISEx WebSocket closed, reconnecting...');
        this.scheduleReconnect();
      });
    } catch (err) {
      logger.error('Failed to connect RISEx WebSocket', { err });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  private async handleEvent(event: RisexWsEvent) {
    switch (event.type) {
      case 'fill':
        await this.handleFill(event.data);
        break;
      case 'liquidation':
        await this.handleLiquidation(event.data);
        break;
      case 'price':
        await this.handlePrice(event.data);
        break;
    }
  }

  private async handleFill(data: any) {
    logger.debug('Fill event', { orderId: data.orderId });

    // Find position by externalPosId and update it
    const position = await prisma.position.findFirst({
      where: { externalPosId: data.orderId },
    });

    if (position) {
      await prisma.position.update({
        where: { id: position.id },
        data: { markPrice: data.price },
      });
    }

    await this.publisher.publish(
      REDIS_CHANNELS.POSITION_UPDATES,
      JSON.stringify({
        type: 'fill',
        orderId: data.orderId,
        price: data.price,
        size: data.size,
      }),
    );
  }

  private async handleLiquidation(data: any) {
    logger.warn('Liquidation event', { positionId: data.positionId });

    const position = await prisma.position.findFirst({
      where: { externalPosId: data.positionId, isOpen: true },
      include: {
        user: { include: { telegramAccount: true } },
      },
    });

    if (!position) return;

    // Mark position as closed
    await prisma.position.update({
      where: { id: position.id },
      data: { isOpen: false, closedAt: new Date(), realizedPnl: -Number(position.marginUSDC) },
    });

    const chatId = (position.user as any)?.telegramAccount?.chatId;
    if (chatId) {
      await this.publisher.publish(
        REDIS_CHANNELS.LIQUIDATION_ALERTS,
        JSON.stringify({
          telegramChatId: chatId,
          market: position.market,
          side: position.side,
          loss: Number(position.marginUSDC),
        }),
      );
    }
  }

  private async handlePrice(data: any) {
    // Cache price in Redis
    await this.redis.setex(`price:${data.symbol}`, 10, String(data.price));

    // Update market cache in DB
    await prisma.marketCache.upsert({
      where: { symbol: data.symbol },
      update: { markPrice: data.price },
      create: {
        symbol: data.symbol,
        baseAsset: data.symbol.split('-')[0] || data.symbol,
        quoteAsset: 'USDC',
        markPrice: data.price,
        indexPrice: data.price,
        fundingRate: 0,
        openInterest: 0,
        volume24h: 0,
        change24h: 0,
        maxLeverage: 100,
      },
    });
  }

  async stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    await this.publisher.quit();
    logger.info('RISEx WebSocket listener stopped');
  }
}
