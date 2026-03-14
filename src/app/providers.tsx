'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { YieldProvider } from '@yo-protocol/react';
import { wagmiConfig } from '@/lib/wagmi';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@rainbow-me/rainbowkit/styles.css';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#00E5A0', accentColorForeground: '#080C0A', borderRadius: 'medium' })}>
          <YieldProvider
            partnerId={9999}
            defaultSlippageBps={50}
            onError={(err) => console.error('[YO Error]', err)}
          >
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </YieldProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
