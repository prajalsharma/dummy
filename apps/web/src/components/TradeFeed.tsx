'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

async function fetchFeed() {
  const res = await fetch(`${PUBLIC_API_URL}/api/v1/trades/feed?limit=20`);
  if (!res.ok) return [];
  return res.json();
}

function timeAgo(date: string, now: number): string {
  const s = Math.floor((now - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function TradeFeed() {
  const { data: feed = [] } = useQuery<FeedEntry[]>({
    queryKey: ['trade-feed'],
    queryFn: fetchFeed,
    refetchInterval: 10000,
  });

  // Only compute relative times on the client to avoid SSR/hydration mismatch
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="font-semibold text-sm">Live Trade Feed</h3>
        </div>
        <span className="text-xs text-slate-500">Updates every 10s</span>
      </div>

      <div className="divide-y divide-dark-700/60 max-h-[420px] overflow-y-auto">
        {feed.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500 text-sm">
            No trades yet — be the first to trade!
          </div>
        ) : (
          feed.map((entry) => {
            const isLong = entry.side === 'LONG';
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-dark-700/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                      isLong
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {isLong ? '▲ LONG' : '▼ SHORT'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{entry.displayName}</div>
                    <div className="text-xs text-slate-500">
                      {entry.market} · {entry.leverage}x
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-semibold">
                    ${entry.notional.toLocaleString()}
                  </div>
                  {/* Render time client-side only to prevent hydration mismatch */}
                  <div className="text-xs text-slate-500">
                    {now ? timeAgo(entry.filledAt, now) : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
