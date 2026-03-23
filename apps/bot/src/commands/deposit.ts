import { BotContext } from '../types';
import { prisma } from '@risex/database';
import { RISECHAIN_CHAIN_ID } from '@risex/shared';

export async function depositCommand(ctx: BotContext) {
  const userId = ctx.session.userId;
  if (!userId) {
    return ctx.reply('Please /start the bot first.');
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId, isActive: true },
  });

  if (!wallet) {
    // No wallet yet — guide them to the web dashboard to connect MetaMask
    const dashboardUrl = (process.env.DASHBOARD_URL || 'https://app.risex.io').replace(/\./g, '\\.').replace(/-/g, '\\-');
    await ctx.replyWithMarkdownV2(
      `💳 *Step 1 of 3 — Create Your Trading Wallet*

To start trading you need a Risechain wallet\\. Here's how:

*Option A — Web Dashboard \\(Recommended\\)*
1️⃣ Visit the dashboard:
🌐 [app\\.risex\\.io](https://app.risex.io)
2️⃣ Click *"Connect Wallet"*
3️⃣ Approve the connection in MetaMask
4️⃣ Your wallet is linked automatically\\!

*Option B — Telegram Only*
Reply with your Risechain wallet address:
\`0x...\`

Once linked, come back here to see your deposit address\\.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Open Web Dashboard', url: process.env.DASHBOARD_URL || 'https://app.risex.io' }],
            [{ text: '❓ Need Help?', callback_data: 'cmd_help' }],
          ],
        },
      },
    );
    return;
  }

  // Wallet exists — show full deposit flow
  const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  await ctx.replyWithMarkdownV2(
    `💳 *Deposit USDC — Step by Step*

*Your Trading Wallet:*
\`${wallet.address}\`

━━━━━━━━━━━━━━━━━
*Step 1* — Get Risechain testnet ETH for gas
🔗 Use the Risechain faucet for gas fees

*Step 2* — Bridge or transfer USDC
• Token: *USDC* \\(Circle\\)
• Network: *Risechain Testnet*
• Chain ID: \`${RISECHAIN_CHAIN_ID}\`
• RPC: \`https://testnet.risechain.com\`

*Step 3* — Confirm & trade
Your balance updates within ~30 seconds\\.

━━━━━━━━━━━━━━━━━
⚠️ *Only send USDC on Risechain testnet\\.*
⚠️ Do NOT send mainnet tokens — they will be lost\\.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Check Balance', callback_data: 'cmd_balance' },
            { text: '📈 View Markets', callback_data: 'cmd_markets' },
          ],
          [
            { text: '🌐 Dashboard', url: process.env.DASHBOARD_URL || 'https://app.risex.io' },
          ],
        ],
      },
    },
  );
}
