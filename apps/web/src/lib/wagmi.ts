import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

export const risechainTestnet = defineChain({
  id: 11155931,
  name: 'Risechain Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RISECHAIN_RPC || 'https://testnet.risechain.com'] },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'RISEx Trading',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'risex-trading-mvp',
  chains: [risechainTestnet, sepolia],
  transports: {
    [risechainTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});
