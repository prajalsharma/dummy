import { z } from 'zod';

// ──────────────── User / Auth ────────────────
export const UserSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.string().optional(),
  walletAddress: z.string().optional(),
  referralCode: z.string(),
  referredById: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// ──────────────── Trade / Order ────────────────
export const OrderSideSchema = z.enum(['long', 'short']);
export const OrderTypeSchema = z.enum(['market', 'limit']);
export const OrderStatusSchema = z.enum(['pending', 'open', 'filled', 'cancelled', 'failed']);

export const PlaceOrderRequestSchema = z.object({
  userId: z.string().uuid(),
  market: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  marginUSDC: z.number().positive(),
  leverage: z.number().min(1).max(100),
  limitPrice: z.number().optional(),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  externalOrderId: z.string().optional(),
  market: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  status: OrderStatusSchema,
  marginUSDC: z.number(),
  leverage: z.number(),
  entryPrice: z.number().optional(),
  limitPrice: z.number().optional(),
  size: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Order = z.infer<typeof OrderSchema>;

// ──────────────── Position ────────────────
export const PositionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  orderId: z.string().uuid(),
  market: z.string(),
  side: OrderSideSchema,
  size: z.number(),
  entryPrice: z.number(),
  markPrice: z.number().optional(),
  marginUSDC: z.number(),
  leverage: z.number(),
  unrealizedPnl: z.number().optional(),
  realizedPnl: z.number().optional(),
  liquidationPrice: z.number().optional(),
  isOpen: z.boolean(),
  openedAt: z.date(),
  closedAt: z.date().optional(),
});
export type Position = z.infer<typeof PositionSchema>;

// ──────────────── Market ────────────────
export const MarketSchema = z.object({
  symbol: z.string(),
  baseAsset: z.string(),
  quoteAsset: z.string(),
  markPrice: z.number(),
  indexPrice: z.number(),
  fundingRate: z.number(),
  openInterest: z.number(),
  volume24h: z.number(),
  change24h: z.number(),
  maxLeverage: z.number(),
});
export type Market = z.infer<typeof MarketSchema>;

// ──────────────── Leaderboard ────────────────
export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  telegramUsername: z.string().optional(),
  walletAddress: z.string().optional(),
  totalPnl: z.number(),
  winRate: z.number(),
  tradeCount: z.number(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// ──────────────── WebSocket Messages ────────────────
export const WsMessageTypeSchema = z.enum([
  'position_update',
  'price_update',
  'trade_fill',
  'liquidation',
  'balance_update',
]);

export const WsMessageSchema = z.object({
  type: WsMessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.number(),
});
export type WsMessage = z.infer<typeof WsMessageSchema>;

// ──────────────── Trade Queue Job ────────────────
export const TradeJobSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  telegramChatId: z.string(),
  request: PlaceOrderRequestSchema,
  createdAt: z.number(),
});
export type TradeJob = z.infer<typeof TradeJobSchema>;
