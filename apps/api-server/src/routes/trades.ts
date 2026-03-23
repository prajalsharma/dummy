import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@risex/database';

export const tradesRouter: FastifyPluginAsync = async (app) => {
  app.get('/', async (req, reply) => {
    const { userId, market, limit = '20', offset = '0' } = req.query as {
      userId?: string;
      market?: string;
      limit?: string;
      offset?: string;
    };

    const orders = await prisma.order.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(market ? { market } : {}),
        status: 'FILLED',
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
      skip: parseInt(offset, 10),
    });

    return orders.map((o: any) => ({
      ...o,
      marginUSDC: Number(o.marginUSDC),
      entryPrice: o.entryPrice ? Number(o.entryPrice) : null,
      size: o.size ? Number(o.size) : null,
    }));
  });
};
