'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Navbar } from '@/components/Navbar';
import { PositionsTable } from '@/components/PositionsTable';
import { BalanceCard } from '@/components/BalanceCard';
import { TelegramLinkCard } from '@/components/TelegramLinkCard';
import { TradePanel } from '@/components/TradePanel';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-dark-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
            <p className="text-slate-400 mb-8">Connect your wallet to access your trading dashboard.</p>
          </div>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Trading Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <BalanceCard address={address!} />
          <TelegramLinkCard address={address!} />
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
            <h3 className="text-sm text-slate-400 mb-3">Quick Commands</h3>
            <div className="space-y-2 text-sm font-mono">
              {[
                '/long BTC 100 10',
                '/short ETH 50 5',
                '/positions',
                '/leaderboard',
              ].map((cmd) => (
                <div key={cmd} className="bg-dark-700 rounded px-3 py-2 text-green-400">
                  {cmd}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PositionsTable address={address!} />
          </div>
          <div>
            <TradePanel address={address!} />
          </div>
        </div>
      </main>
    </div>
  );
}
