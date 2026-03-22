'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

async function fetchMarkets() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/markets`);
  if (!res.ok) return [];
  return res.json();
}

const mockMarkets = [
  { symbol: 'BTC-USDC', markPrice: 67500, change24h: 2.4, volume24h: 120000000, maxLeverage: 100 },
  { symbol: 'ETH-USDC', markPrice: 3850, change24h: -1.2, volume24h: 45000000, maxLeverage: 50 },
  { symbol: 'SOL-USDC', markPrice: 185, change24h: 5.1, volume24h: 12000000, maxLeverage: 20 },
];

export function MarketsPreview() {
  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
    refetchInterval: 15000,
  });

  const displayMarkets = markets.length > 0 ? markets : mockMarkets;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Markets</h2>
        <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-white transition-colors">
          Leaderboard →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {displayMarkets.map((m: any) => (
          <div
            key={m.symbol}
            className="bg-dark-800 border border-dark-700 rounded-xl px-5 py-4 hover:border-green-500/30 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="font-bold">{m.symbol}</div>
              <div className="text-xs text-slate-500">Max {m.maxLeverage}x · Vol ${(Number(m.volume24h) / 1e6).toFixed(1)}M</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-lg">
                ${Number(m.markPrice).toLocaleString()}
              </div>
              <span className={`text-xs font-medium ${m.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {m.change24h >= 0 ? '+' : ''}{m.change24h?.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
