'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUSDC, truncateAddress } from '@risex/shared';

interface Props {
  address: string;
}

export function PositionsTable({ address }: Props) {
  const { data: user } = useQuery({
    queryKey: ['user', address],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/by-wallet/${address}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!address,
  });

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions', user?.userId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/${user.userId}/positions?open=true`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.userId,
    refetchInterval: 15000,
  });

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
        <h3 className="font-medium">Open Positions</h3>
        <span className="text-sm text-slate-500">{positions.length} active</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No open positions. Start trading via /long or /short in the bot.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-dark-700">
                <th className="text-left px-4 py-3">Market</th>
                <th className="text-left px-4 py-3">Side</th>
                <th className="text-right px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Entry</th>
                <th className="text-right px-4 py-3">Mark</th>
                <th className="text-right px-4 py-3">PnL</th>
                <th className="text-right px-4 py-3">Liq.</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: any) => (
                <tr key={p.id} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.market}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.side === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.side} {p.leverage}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(p.size).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono">${Number(p.entryPrice).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.markPrice ? `$${Number(p.markPrice).toLocaleString()}` : '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono ${p.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.unrealizedPnl != null ? formatUSDC(p.unrealizedPnl) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-orange-400">
                    {p.liquidationPrice ? `$${Number(p.liquidationPrice).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
