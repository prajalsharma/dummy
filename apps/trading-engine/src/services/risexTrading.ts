import { ExchangeClient, InfoClient, formatWad, parseWad } from 'risex-client';
import { Market } from '@risex/shared';
import { logger } from '../logger';

const RISEX_API_BASE = process.env.RISEX_API_BASE || 'https://api.rise.trade';

const MARKET_ID_MAP: Record<string, number> = {
  'BTC': 0, 'BTC-USDC': 0,
  'ETH': 1, 'ETH-USDC': 1,
  'BNB': 2, 'BNB-USDC': 2,
  'SOL': 3, 'SOL-USDC': 3,
};

function resolveMarketId(market: string): number {
  const id = MARKET_ID_MAP[market.toUpperCase()];
  if (id === undefined) throw new Error(`Unknown market: ${market}. Supported: BTC, ETH, BNB, SOL`);
  return id;
}

interface OrderResult {
  orderId: string;
  status: string;
  filledPrice?: number;
  filledSize?: number;
}

export class RisexTradingClient {
  private exchange: ExchangeClient;
  private info: InfoClient;
  private initialized = false;

  constructor() {
    this.exchange = new ExchangeClient({
      accountKey: process.env.ACCOUNT_PRIVATE_KEY || '',
      signerKey: process.env.SIGNER_PRIVATE_KEY || '',
      baseUrl: RISEX_API_BASE,
    });
    this.info = new InfoClient({ baseUrl: RISEX_API_BASE });
  }

  private async ensureInit() {
    if (!this.initialized) {
      await this.exchange.init();
      await this.exchange.registerSigner();
      this.initialized = true;
      logger.info('RISEx ExchangeClient initialized');
    }
  }

  async getMarkets(): Promise<Market[]> {
    const markets = await this.info.getMarkets();
    return markets.map((m: any) => ({
      symbol: `${m.base_asset || m.display_name?.split('/')[0]}-USDC`,
      baseAsset: m.base_asset || m.display_name?.split('/')[0] || 'UNKNOWN',
      quoteAsset: 'USDC',
      markPrice: parseFloat(formatWad(m.mark_price || '0')),
      indexPrice: parseFloat(formatWad(m.index_price || m.mark_price || '0')),
      fundingRate: parseFloat(formatWad(m.funding_rate || '0')),
      openInterest: parseFloat(formatWad(m.open_interest || '0')),
      volume24h: parseFloat(formatWad(m.volume_24h || '0')),
      change24h: parseFloat(formatWad(m.price_change_24h || '0')),
      maxLeverage: m.config?.max_leverage || 100,
    }));
  }

  async placeOrder(params: {
    walletAddress: string;
    market: string;
    side: 'long' | 'short';
    type: 'market' | 'limit';
    size: number;
    leverage: number;
    limitPrice?: number;
  }): Promise<OrderResult> {
    await this.ensureInit();
    const marketId = resolveMarketId(params.market);
    await this.exchange.updateLeverage(marketId, parseWad(String(params.leverage)));
    const sizeWad = parseWad(params.size.toFixed(6)).toString();
    let result: any;
    if (params.type === 'market') {
      result = params.side === 'long'
        ? await this.exchange.marketBuy(marketId, sizeWad)
        : await this.exchange.marketSell(marketId, sizeWad);
    } else {
      if (!params.limitPrice) throw new Error('limitPrice required for limit orders');
      const priceWad = parseWad(params.limitPrice.toFixed(6)).toString();
      result = params.side === 'long'
        ? await this.exchange.limitBuy(marketId, sizeWad, priceWad)
        : await this.exchange.limitSell(marketId, sizeWad, priceWad);
    }
    return { orderId: result.order_id, status: 'FILLED', filledPrice: params.limitPrice, filledSize: params.size };
  }

  async closePosition(positionId: string, market: string): Promise<OrderResult> {
    await this.ensureInit();
    const marketId = resolveMarketId(market);
    const result = await this.exchange.closePosition(marketId);
    if (!result) throw new Error('No open position to close on RISEx for market ' + market);
    return { orderId: result.order_id, status: 'FILLED' };
  }

  async getBalance(walletAddress: string): Promise<{ available: number; inPositions: number; equity: number; unrealizedPnl: number }> {
    const [balanceWad, equityWad] = await Promise.all([
      this.info.getBalance(walletAddress),
      this.info.getEquity(walletAddress),
    ]);
    const available = parseFloat(formatWad(balanceWad));
    const equity = parseFloat(formatWad(equityWad));
    return { available, inPositions: equity - available, equity, unrealizedPnl: equity - available };
  }

  async getPositions(walletAddress: string): Promise<any[]> {
    return await this.info.getAllPositions(walletAddress);
  }
}
