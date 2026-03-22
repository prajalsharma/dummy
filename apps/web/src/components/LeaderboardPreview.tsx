'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { truncateAddress, formatUSDC } from '@risex/shared';

async function fetchTop() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leaderboard?limit=5`);
  if (!res.ok) return [];
  return res.json();
}

export function LeaderboardPreview() {
  const { data = [] } = useQuery({ queryKey: ['leaderboard-preview'], queryFn: fetchTop });

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">🏆 Top Traders</h2>
        <Link href="/leaderboard" className="text-sm text-slate-400 hover:text-white transition-colors">
          Full Leaderboard →
        </Link>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No trades yet. Be the first!
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {data.map((entry: any, i: number) => (
              <div key={entry.userId} className="flex items-center justify-between px-6 py-4 hover:bg-dark-700/30 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xl w-8">{medals[i] || `#${i + 1}`}</span>
                  <div>
                    <div className="font-medium">
                      {entry.username ? `@${entry.username}` : truncateAddress(entry.walletAddress || '')}
                    </div>
                    <div className="text-sm text-slate-500">{entry.tradeCount} trades</div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${entry.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatUSDC(entry.totalPnl)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
