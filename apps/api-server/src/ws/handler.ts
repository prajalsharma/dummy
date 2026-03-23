import { Redis } from 'ioredis';
import { REDIS_CHANNELS } from '@risex/shared';
import { logger } from '../logger';

type WsRouteHandler = (connection: any, req: any) => void;

export function wsHandler(redis: Redis): WsRouteHandler {
  return (connection, req) => {
    const socket = connection.socket;
    const clientId = Math.random().toString(36).slice(2);
    const subscribedUserId = (req.query as any)?.userId;

    logger.info('WebSocket client connected', { clientId, subscribedUserId });

    // Create per-connection subscriber
    const subscriber = redis.duplicate();
    subscriber.subscribe(
      REDIS_CHANNELS.PRICE_UPDATES,
      REDIS_CHANNELS.POSITION_UPDATES,
      REDIS_CHANNELS.TRADE_RESULTS,
    );

    subscriber.on('message', (_channel, message) => {
      if (socket.readyState !== 1 /* OPEN */) return;

      try {
        const data = JSON.parse(message);

        // Filter: only send position/trade updates for subscribed user
        if (subscribedUserId && data.userId && data.userId !== subscribedUserId) {
          return;
        }

        socket.send(message);
      } catch {
        // ignore
      }
    });

    socket.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        // Handle ping
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore
      }
    });

    socket.on('close', () => {
      logger.info('WebSocket client disconnected', { clientId });
      subscriber.unsubscribe().then(() => subscriber.quit());
    });

    socket.on('error', (err: Error) => {
      logger.error('WebSocket error', { clientId, err });
      subscriber.quit();
    });

    // Send welcome
    socket.send(JSON.stringify({ type: 'connected', clientId, timestamp: Date.now() }));
  };
}
