'use client';

import { useQuery } from '@tanstack/react-query';

interface Props {
  address: string;
}

export function TelegramLinkCard({ address }: Props) {
  const { data } = useQuery({
    queryKey: ['user', address],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/by-wallet/${address}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!address,
  });

  const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/RiseChain_RISEx_Bot';
  const isLinked = !!data?.telegram?.telegramId;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
      <h3 className="text-sm text-slate-400 mb-4">Telegram Account</h3>

      {isLinked ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-400 font-medium">Linked</span>
          </div>
          <div className="text-sm text-slate-300">
            {data.telegram.username ? `@${data.telegram.username}` : data.telegram.firstName}
          </div>
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ✈️ Open Bot
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-400">
            Link your Telegram account to trade via bot.
          </div>
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors w-fit"
          >
            ✈️ Connect Telegram
          </a>
        </div>
      )}
    </div>
  );
}
