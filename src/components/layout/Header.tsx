'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-background font-bold text-sm sm:text-base">Y</span>
          </div>
          <span className="font-semibold text-base sm:text-lg text-text-primary tracking-tight">
            YO<span className="text-accent ml-0.5">.</span>
          </span>
        </Link>

        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="bg-white text-black font-medium px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm transition-all hover:bg-white/90 active:scale-95"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        className="bg-danger/10 text-danger font-medium px-4 py-2 rounded-full text-xs sm:text-sm border border-danger/20"
                      >
                        Wrong Network
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={openChainModal}
                        className="hidden sm:flex items-center gap-1.5 bg-surface-2 border border-white/[0.06] rounded-full px-3 py-2 text-xs text-text-secondary hover:border-white/[0.12] transition-colors"
                      >
                        {chain.hasIcon && chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain'}
                            src={chain.iconUrl}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span>{chain.name}</span>
                      </button>
                      <button
                        onClick={openAccountModal}
                        className="flex items-center gap-2 bg-surface-2 border border-white/[0.06] rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-text-primary hover:border-white/[0.12] transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                        </div>
                        <span>{account.displayName}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
