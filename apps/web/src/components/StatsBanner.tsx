'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchStats() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/stats`);
  if (!res.ok) return null;
  return res.json();
}

export function StatsBanner() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  if (!stats) {
    return (
      <div className="border-b border-dark-700 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-sm text-slate-500">
          No activity yet — be the first to trade!
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Total Traders', value: stats.totalTraders?.toLocaleString() ?? '0' },
    { label: 'Total Trades', value: stats.totalTrades?.toLocaleString() ?? '0' },
    { label: 'Open Positions', value: stats.openPositions?.toLocaleString() ?? '0' },
    {
      label: 'Volume',
      value: stats.totalVolumeUSDC >= 1_000_000
        ? `$${(stats.totalVolumeUSDC / 1e6).toFixed(2)}M`
        : `$${Number(stats.totalVolumeUSDC).toLocaleString()}`,
    },
    {
      label: 'Top Trader PnL',
      value: `+$${Number(stats.topTraderPnlUSDC).toLocaleString()}`,
      green: true,
    },
  ];

  return (
    <div className="border-b border-dark-700 bg-dark-800/50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{item.label}</span>
              <span className={`font-mono font-semibold ${item.green ? 'text-green-400' : 'text-white'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
