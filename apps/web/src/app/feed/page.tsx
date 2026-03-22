'use client';

import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { StatsBanner } from '@/components/StatsBanner';

interface FeedEntry {
  id: string;
  displayName: string;
  market: string;
  side: 'LONG' | 'SHORT';
  marginUSDC: number;
  leverage: number;
  notional: number;
  entryPrice: number | null;
  filledAt: string;
}

async function fetchFeed(limit = 50, offset = 0) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) return [];
  return res.json();
}

const MOCK: FeedEntry[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i),
  displayName: ['@cryptobull', '@ethmaxi', '0x4a2f…e1b3', '@solknight', '@risetrader'][i % 5],
  market: ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'][i % 3],
  side: i % 2 === 0 ? 'LONG' : 'SHORT',
  marginUSDC: [100, 200, 500, 1000][i % 4],
  leverage: [5, 10, 20, 50][i % 4],
  notional: [500, 2000, 10000, 50000][i % 4],
  entryPrice: [67420, 3851, 186][i % 3],
  filledAt: new Date(Date.now() - i * 45000).toISOString(),
}));

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function FeedPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['feed-full'],
    queryFn: () => fetchFeed(50, 0),
    refetchInterval: 10000,
  });

  const feed: FeedEntry[] = data.length > 0 ? data : MOCK;

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <StatsBanner />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Live Trade Feed</h1>
            <p className="text-sm text-slate-400 mt-1">All recent fills across all markets</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 px-5 py-3 text-xs font-medium text-slate-500 border-b border-dark-700 uppercase tracking-wide">
            <span>Trader</span>
            <span>Market / Side</span>
            <span className="text-right">Margin</span>
            <span className="text-right">Notional</span>
            <span className="text-right">Time</span>
          </div>

          <div className="divide-y divide-dark-700/60">
            {feed.map((entry) => {
              const isLong = entry.side === 'LONG';
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-5 items-center px-5 py-3.5 hover:bg-dark-700/30 transition-colors"
                >
                  <span className="text-sm font-medium truncate pr-2">{entry.displayName}</span>

                  <div>
                    <span className="text-sm font-medium text-slate-300">{entry.market}</span>
                    <span
                      className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                        isLong ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {isLong ? '▲L' : '▼S'} {entry.leverage}x
                    </span>
                  </div>

                  <span className="text-right text-sm font-mono text-slate-300">
                    ${entry.marginUSDC.toLocaleString()}
                  </span>

                  <span className="text-right text-sm font-mono font-semibold">
                    ${entry.notional.toLocaleString()}
                  </span>

                  <span className="text-right text-xs text-slate-500">
                    {timeAgo(entry.filledAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
