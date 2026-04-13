"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeJobSchema = exports.WsMessageSchema = exports.WsMessageTypeSchema = exports.LeaderboardEntrySchema = exports.MarketSchema = exports.PositionSchema = exports.OrderSchema = exports.PlaceOrderRequestSchema = exports.OrderStatusSchema = exports.OrderTypeSchema = exports.OrderSideSchema = exports.UserSchema = void 0;
const zod_1 = require("zod");
// ──────────────── User / Auth ────────────────
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    telegramId: zod_1.z.string().optional(),
    walletAddress: zod_1.z.string().optional(),
    referralCode: zod_1.z.string(),
    referredById: zod_1.z.string().uuid().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ──────────────── Trade / Order ────────────────
exports.OrderSideSchema = zod_1.z.enum(['long', 'short']);
exports.OrderTypeSchema = zod_1.z.enum(['market', 'limit']);
exports.OrderStatusSchema = zod_1.z.enum(['pending', 'open', 'filled', 'cancelled', 'failed']);
exports.PlaceOrderRequestSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    market: zod_1.z.string(),
    side: exports.OrderSideSchema,
    type: exports.OrderTypeSchema,
    marginUSDC: zod_1.z.number().positive(),
    leverage: zod_1.z.number().min(1).max(100),
    limitPrice: zod_1.z.number().optional(),
});
exports.OrderSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    externalOrderId: zod_1.z.string().optional(),
    market: zod_1.z.string(),
    side: exports.OrderSideSchema,
    type: exports.OrderTypeSchema,
    status: exports.OrderStatusSchema,
    marginUSDC: zod_1.z.number(),
    leverage: zod_1.z.number(),
    entryPrice: zod_1.z.number().optional(),
    limitPrice: zod_1.z.number().optional(),
    size: zod_1.z.number().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// ──────────────── Position ────────────────
exports.PositionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    orderId: zod_1.z.string().uuid(),
    market: zod_1.z.string(),
    side: exports.OrderSideSchema,
    size: zod_1.z.number(),
    entryPrice: zod_1.z.number(),
    markPrice: zod_1.z.number().optional(),
    marginUSDC: zod_1.z.number(),
    leverage: zod_1.z.number(),
    unrealizedPnl: zod_1.z.number().optional(),
    realizedPnl: zod_1.z.number().optional(),
    liquidationPrice: zod_1.z.number().optional(),
    isOpen: zod_1.z.boolean(),
    openedAt: zod_1.z.date(),
    closedAt: zod_1.z.date().optional(),
});
// ──────────────── Market ────────────────
exports.MarketSchema = zod_1.z.object({
    symbol: zod_1.z.string(),
    baseAsset: zod_1.z.string(),
    quoteAsset: zod_1.z.string(),
    markPrice: zod_1.z.number(),
    indexPrice: zod_1.z.number(),
    fundingRate: zod_1.z.number(),
    openInterest: zod_1.z.number(),
    volume24h: zod_1.z.number(),
    change24h: zod_1.z.number(),
    maxLeverage: zod_1.z.number(),
});
// ──────────────── Leaderboard ────────────────
exports.LeaderboardEntrySchema = zod_1.z.object({
    rank: zod_1.z.number(),
    userId: zod_1.z.string(),
    telegramUsername: zod_1.z.string().optional(),
    walletAddress: zod_1.z.string().optional(),
    totalPnl: zod_1.z.number(),
    winRate: zod_1.z.number(),
    tradeCount: zod_1.z.number(),
});
// ──────────────── WebSocket Messages ────────────────
exports.WsMessageTypeSchema = zod_1.z.enum([
    'position_update',
    'price_update',
    'trade_fill',
    'liquidation',
    'balance_update',
]);
exports.WsMessageSchema = zod_1.z.object({
    type: exports.WsMessageTypeSchema,
    payload: zod_1.z.unknown(),
    timestamp: zod_1.z.number(),
});
// ──────────────── Trade Queue Job ────────────────
exports.TradeJobSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    userId: zod_1.z.string(),
    telegramChatId: zod_1.z.string(),
    request: exports.PlaceOrderRequestSchema,
    createdAt: zod_1.z.number(),
});
//# sourceMappingURL=types.js.map