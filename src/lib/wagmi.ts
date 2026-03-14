import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, mainnet, arbitrum } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'YO Savings',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, mainnet, arbitrum],
  ssr: true,
});
