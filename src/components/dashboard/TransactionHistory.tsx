'use client';

import { useAccount } from 'wagmi';
import { useUserHistory } from '@yo-protocol/react';
import { VAULTS, type VaultId } from '@/lib/yo';
import { getExplorerUrl } from '@/lib/utils';
import { ExternalLink, Clock } from 'lucide-react';
import { useState } from 'react';
import { VaultIcon } from '@/components/ui/VaultIcon';

export function TransactionHistory() {
  const { address } = useAccount();
  const [selectedVault, setSelectedVault] = useState<VaultId>('yoUSD');
  const { history, isLoading } = useUserHistory(selectedVault, address, { limit: 20 });

  const vaultIds = Object.keys(VAULTS) as VaultId[];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <span className="section-label">/ Transaction History</span>
      </div>

      <div className="bg-surface-2 border border-white/[0.04] rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.04]">
          <div className="flex gap-1.5 overflow-x-auto">
            {vaultIds.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedVault(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                  selectedVault === id
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-dim hover:text-text-secondary'
                }`}
              >
                <VaultIcon icon={VAULTS[id].icon} size={14} /> {VAULTS[id].asset}
              </button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-3 px-4 sm:px-5 py-2 text-[10px] text-text-dim uppercase tracking-wider border-b border-white/[0.02]">
          <span>Amount</span>
          <span className="text-center">Type</span>
          <span className="text-right">Link</span>
        </div>

        {/* Content */}
        {!address ? (
          <div className="px-5 py-10 text-center">
            <Clock className="w-6 h-6 text-text-dim mx-auto mb-2" />
            <p className="text-text-dim text-xs">Connect wallet to view history</p>
          </div>
        ) : isLoading ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-3 items-center px-4 sm:px-5 py-3 border-b border-white/[0.02] last:border-0">
                <div className="shimmer h-4 w-20 rounded" />
                <div className="shimmer h-4 w-16 rounded mx-auto" />
                <div className="shimmer h-4 w-8 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-text-dim text-xs">No transactions yet</p>
          </div>
        ) : (
          <div>
            {history.map((tx, index) => {
              const isDeposit = tx.type === 'deposit';
              return (
                <div
                  key={`${tx.transactionHash}-${index}`}
                  className="grid grid-cols-3 items-center px-4 sm:px-5 py-3 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isDeposit ? 'bg-accent/10' : 'bg-orange-500/10'
                    }`}>
                      {isDeposit ? <VaultIcon icon={VAULTS[selectedVault].icon} size={12} /> : <span className="text-[10px]">↑</span>}
                    </div>
                    <span className="text-xs sm:text-sm font-mono text-text-primary truncate">
                      {tx.assets?.formatted ?? '0'} {VAULTS[selectedVault].asset}
                    </span>
                  </div>
                  <span className={`text-xs text-center font-medium ${isDeposit ? 'text-accent' : 'text-orange-400'}`}>
                    {isDeposit ? 'Deposite' : 'Withdraw'}
                  </span>
                  <div className="text-right">
                    <a
                      href={getExplorerUrl(tx.transactionHash, VAULTS[selectedVault].chains[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-text-dim hover:text-accent transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
