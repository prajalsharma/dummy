'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUSDC, formatPnl } from '@risex/shared';

interface Props {
  address: string;
}

async function fetchBalance(address: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/by-wallet/${address}`);
  if (!res.ok) return null;
  return res.json();
}

export function BalanceCard({ address }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', address],
    queryFn: () => fetchBalance(address),
    enabled: !!address,
    refetchInterval: 15000,
  });

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
      <h3 className="text-sm text-slate-400 mb-4">Account Balance</h3>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-dark-700 rounded w-2/3" />
          <div className="h-4 bg-dark-700 rounded w-1/2" />
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold font-mono">
              {formatUSDC(data.leaderboard?.totalPnl || 0)}
            </div>
            <div className="text-sm text-slate-500">Total PnL</div>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <div className="font-medium">{data.totalTrades}</div>
              <div className="text-slate-500">Trades</div>
            </div>
            <div>
              <div className="font-medium">
                {data.leaderboard?.winRate
                  ? `${(Number(data.leaderboard.winRate) * 100).toFixed(1)}%`
                  : '—'}
              </div>
              <div className="text-slate-500">Win Rate</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">
          <p>Wallet not registered.</p>
          <p className="mt-1">Use <span className="font-mono text-green-400">/start</span> in the bot first.</p>
        </div>
      )}
    </div>
  );
}
