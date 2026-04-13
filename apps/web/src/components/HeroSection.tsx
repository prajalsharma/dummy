'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PUBLIC_BOT_URL } from '@/lib/env';

export function HeroSection() {
  return (
    <section className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-sm mb-8 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live on Risechain Testnet
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-[72px] font-extrabold mb-5 leading-[1.05] tracking-tight">
          Trade Perps.{' '}
          <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-500">
            Win Together.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Social perp trading on Risechain. Up to <strong className="text-white">100x leverage</strong>,
          live leaderboards, TP/SL — all via Telegram or web.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">
          <ConnectButton label="Connect & Trade" />
          <a
            href={PUBLIC_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-600 transition-all text-slate-200 font-medium"
          >
            ✈️ Open Telegram Bot
          </a>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-dark-600 hover:border-green-500/40 transition-all text-slate-400 hover:text-white font-medium"
          >
            🏆 Leaderboard
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { icon: '⚡', label: 'Max Leverage', value: '100x' },
            { icon: '💸', label: 'Settlement', value: 'USDC' },
            { icon: '🔗', label: 'Chain', value: 'Risechain' },
            { icon: '🛡️', label: 'Risk Controls', value: 'TP/SL' },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-dark-800 border border-dark-700 hover:border-green-500/30 rounded-xl p-4 transition-colors"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-lg font-bold text-green-400">{item.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
