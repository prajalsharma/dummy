'use client';

import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { truncateAddress, formatUSDC, formatPercent } from '@risex/shared';

async function fetchLeaderboard() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leaderboard?limit=50`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['leaderboard'], queryFn: fetchLeaderboard, refetchInterval: 30000 });

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🏆</span>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700 text-sm text-slate-400">
                  <th className="text-left px-4 py-3 w-12">Rank</th>
                  <th className="text-left px-4 py-3">Trader</th>
                  <th className="text-right px-4 py-3">Total PnL</th>
                  <th className="text-right px-4 py-3">Win Rate</th>
                  <th className="text-right px-4 py-3">Trades</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((entry: any) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const rankDisplay = medals[entry.rank - 1] || `#${entry.rank}`;
                  return (
                    <tr key={entry.userId} className="border-b border-dark-700/50 hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3 text-lg">{rankDisplay}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {entry.username ? `@${entry.username}` : entry.walletAddress ? truncateAddress(entry.walletAddress) : 'Anonymous'}
                        </div>
                        {entry.walletAddress && (
                          <div className="text-xs text-slate-500 font-mono">{truncateAddress(entry.walletAddress)}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${entry.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatUSDC(entry.totalPnl)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatPercent(entry.winRate * 100)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{entry.tradeCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(!data || data.length === 0) && (
              <div className="text-center py-16 text-slate-500">
                No traders yet. Be the first to trade!
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
