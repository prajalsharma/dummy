export const RISECHAIN_CHAIN_ID = 11155931;
export const RISECHAIN_RPC_URL = process.env.RISECHAIN_RPC_URL;
export const RISEX_API_BASE = process.env.RISEX_API_BASE;
export const RISEX_WS_URL = process.env.RISEX_WS_URL;

export const REDIS_CHANNELS = {
  TRADE_REQUESTS: 'trade:requests',
  TRADE_RESULTS: 'trade:results',
  PRICE_UPDATES: 'price:updates',
  LIQUIDATION_ALERTS: 'liquidation:alerts',
  POSITION_UPDATES: 'position:updates',
  BLOCK_EVENTS: 'block:events',
  TRADE_BROADCAST: 'trade:broadcast',  // social feed — all fills broadcast here
  TP_SL_HIT: 'tpsl:hit',              // TP/SL trigger events
  DEPOSIT_ALERTS: 'deposit:alerts',   // deposit confirmation for user notification
} as const;

export const QUEUE_NAMES = {
  TRADE_QUEUE: 'trade-queue',
  NOTIFICATION_QUEUE: 'notification-queue',
  LIQUIDATION_QUEUE: 'liquidation-queue',
} as const;

export const RATE_LIMITS = {
  TELEGRAM_GLOBAL_PER_SEC: 30,
  TELEGRAM_USER_PER_MIN: 20,
  API_PER_MIN: 60,
  TRADE_PER_MIN: 10,
} as const;

export const CACHE_TTL = {
  MARKETS: 30,        // seconds
  LEADERBOARD: 60,
  PRICE: 5,
  USER_BALANCE: 10,
  STATS: 30,
} as const;
