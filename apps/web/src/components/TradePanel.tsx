'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { PUBLIC_API_URL, PUBLIC_BOT_URL } from '@/lib/env';

interface Props {
  address: string;
}

// Approximate liquidation price (simplified: maintenance margin of 5%)
function calcLiqPrice(side: 'long' | 'short', entryPrice: number, leverage: number): number {
  const maintenanceMargin = 0.05;
  if (side === 'long') {
    return entryPrice * (1 - 1 / leverage + maintenanceMargin);
  }
  return entryPrice * (1 + 1 / leverage - maintenanceMargin);
}

async function fetchMarkets() {
  const res = await fetch(`${PUBLIC_API_URL}/api/v1/markets`);
  if (!res.ok) return [];
  return res.json();
}

export function TradePanel({ address }: Props) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [market, setMarket] = useState('BTC-USDC');
  const [margin, setMargin] = useState('100');
  const [leverage, setLeverage] = useState('10');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
    refetchInterval: 15000,
  });

  const availableMarkets = markets.length > 0
    ? markets.map((m: any) => m.symbol)
    : ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'];

  const currentMarket = markets.find((m: any) => m.symbol === market);
  const entryPrice = currentMarket?.markPrice ?? 0;

  const marginNum = parseFloat(margin || '0');
  const leverageNum = parseInt(leverage || '1', 10);
  const notional = marginNum * leverageNum;
  const liqPrice = entryPrice > 0 ? calcLiqPrice(side, entryPrice, leverageNum) : null;

  const baseCommand = `/${side} ${market.split('-')[0]} ${margin} ${leverage}`;
  const tpStr = tp ? ` tp=${tp}` : '';
  const slStr = sl ? ` sl=${sl}` : '';
  const botCommand = baseCommand + tpStr + slStr;

  function copyCommand() {
    navigator.clipboard.writeText(botCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const leverageWarning = leverageNum >= 50;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700">
        <h3 className="font-semibold">Place Trade</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Side selector */}
        <div className="flex rounded-lg overflow-hidden border border-dark-600">
          <button
            onClick={() => setSide('long')}
            className={clsx('flex-1 py-2 text-sm font-semibold transition-colors', side === 'long' ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-white')}
          >
            ▲ Long
          </button>
          <button
            onClick={() => setSide('short')}
            className={clsx('flex-1 py-2 text-sm font-semibold transition-colors', side === 'short' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white')}
          >
            ▼ Short
          </button>
        </div>

        {/* Market */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500/50"
          >
            {availableMarkets.map((sym: string) => (
              <option key={sym}>{sym}</option>
            ))}
          </select>
          {entryPrice > 0 && (
            <div className="text-xs text-slate-500 mt-1">Mark price: ${entryPrice.toLocaleString()}</div>
          )}
        </div>

        {/* Margin */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Margin (USDC)</label>
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500/50"
            min="1"
            placeholder="100"
          />
        </div>

        {/* Leverage */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-slate-400">Leverage</label>
            <span className={clsx('text-xs font-bold', leverageWarning ? 'text-yellow-400' : 'text-white')}>
              {leverage}x {leverageWarning ? '⚠️' : ''}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
          </div>
        </div>

        {/* TP/SL inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Take Profit (optional)</label>
            <input
              type="number"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder={entryPrice > 0 ? String(Math.round(entryPrice * (side === 'long' ? 1.1 : 0.9))) : 'Price'}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500/50 text-green-400 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Stop Loss (optional)</label>
            <input
              type="number"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder={entryPrice > 0 ? String(Math.round(entryPrice * (side === 'long' ? 0.95 : 1.05))) : 'Price'}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-red-400 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-dark-700 rounded-lg p-3 text-sm space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Notional</span>
            <span className="text-white font-mono font-semibold">${notional.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Direction</span>
            <span className={side === 'long' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {side.toUpperCase()} {leverage}x
            </span>
          </div>
          {liqPrice !== null && (
            <div className="flex justify-between text-slate-400">
              <span>Est. Liq. Price</span>
              <span className="text-yellow-400 font-mono">${liqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {tp && (
            <div className="flex justify-between text-slate-400">
              <span>Take Profit</span>
              <span className="text-green-400 font-mono">${Number(tp).toLocaleString()}</span>
            </div>
          )}
          {sl && (
            <div className="flex justify-between text-slate-400">
              <span>Stop Loss</span>
              <span className="text-red-400 font-mono">${Number(sl).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Bot command with copy */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Telegram command:</div>
          <div
            className="bg-dark-700 rounded-lg px-3 py-2.5 font-mono text-green-400 text-sm flex items-center justify-between cursor-pointer hover:bg-dark-600 transition-colors group"
            onClick={copyCommand}
            title="Click to copy"
          >
            <span className="truncate">{botCommand}</span>
            <span className="text-xs text-slate-500 group-hover:text-slate-300 ml-2 shrink-0 transition-colors">
              {copied ? '✓ Copied' : '⧉ Copy'}
            </span>
          </div>
        </div>

        <a
          href={`${PUBLIC_BOT_URL}?start=trade`}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'block text-center py-3 rounded-xl font-semibold text-white transition-colors',
            side === 'long' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500',
          )}
        >
          Open Telegram Bot →
        </a>
      </div>
    </div>
  );
}
