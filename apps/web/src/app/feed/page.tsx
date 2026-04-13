'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatsBanner } from '@/components/StatsBanner';
import { PUBLIC_API_URL } from '@/lib/env';

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
    `${PUBLIC_API_URL}/api/v1/trades/feed?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) return [];
  return res.json();
}

function timeAgo(date: string, now: number): string {
  const s = Math.floor((now - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function FeedPage() {
  const { data: feed = [], isLoading } = useQuery<FeedEntry[]>({
    queryKey: ['feed-full'],
    queryFn: () => fetchFeed(50, 0),
    refetchInterval: 10000,
  });

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

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
            {isLoading ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">Loading feed…</div>
            ) : feed.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">
                No trades yet — be the first to trade!
              </div>
            ) : (
              feed.map((entry) => {
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
                      {now ? timeAgo(entry.filledAt, now) : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
