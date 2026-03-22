import { Navbar } from '@/components/Navbar';
import { StatsBanner } from '@/components/StatsBanner';
import { HeroSection } from '@/components/HeroSection';
import { MarketsPreview } from '@/components/MarketsPreview';
import { TradeFeed } from '@/components/TradeFeed';
import { LeaderboardPreview } from '@/components/LeaderboardPreview';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <StatsBanner />
      <main>
        <HeroSection />

        {/* Markets + Live Feed side by side */}
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MarketsPreview />
            </div>
            <div>
              <TradeFeed />
            </div>
          </div>
        </section>

        <LeaderboardPreview />

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Connect Wallet',
                desc: 'Link your Risechain wallet via the web dashboard or Telegram bot. No KYC, no account required.',
                icon: '🔗',
              },
              {
                step: '02',
                title: 'Deposit USDC',
                desc: 'Fund your trading account with USDC on Risechain testnet. Your balance updates in ~30 seconds.',
                icon: '💸',
              },
              {
                step: '03',
                title: 'Trade & Earn',
                desc: 'Open perp positions via Telegram or web. Set TP/SL, climb the leaderboard, invite friends.',
                icon: '🏆',
              },
            ].map((item) => (
              <div key={item.step} className="bg-dark-800 border border-dark-700 hover:border-green-500/30 rounded-xl p-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded">
                    Step {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-green-500/10 via-dark-800 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to trade?</h2>
            <p className="text-slate-400 mb-6">Start with as little as $1 margin. Up to 100x leverage on Risechain.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
              >
                Open Dashboard →
              </Link>
              <a
                href={process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/RiseChain_RISEx_Bot'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-600 text-slate-200 font-medium transition-colors"
              >
                ✈️ Start on Telegram
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-700 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div>© 2025 RISEx Trading. Built on Risechain.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a
              href={process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/RiseChain_RISEx_Bot'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Telegram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
