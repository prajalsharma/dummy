import { InfoClient, formatWad } from 'risex-client';
import { Market } from '@risex/shared';

const RISEX_API_BASE = process.env.RISEX_API_BASE;

if (!RISEX_API_BASE) {
  throw new Error('RISEX_API_BASE is required');
}

interface RisexBalance {
  available: number;
  inPositions: number;
  equity: number;
  unrealizedPnl: number;
}

export class RisexApiClient {
  private info: InfoClient;

  constructor() {
    this.info = new InfoClient({ baseUrl: RISEX_API_BASE });
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

  async getBalance(walletAddress: string): Promise<RisexBalance> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) throw new Error('Invalid wallet address');
    const [balanceWad, equityWad] = await Promise.all([
      this.info.getBalance(walletAddress),
      this.info.getEquity(walletAddress),
    ]);
    const available = parseFloat(formatWad(balanceWad));
    const equity = parseFloat(formatWad(equityWad));
    return { available, inPositions: equity - available, equity, unrealizedPnl: equity - available };
  }

  async getPositions(walletAddress: string): Promise<any[]> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) throw new Error('Invalid wallet address');
    return await this.info.getAllPositions(walletAddress);
  }
}
