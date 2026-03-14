'use client';

import { useState, useMemo } from 'react';
import { useVaults, usePrices } from '@yo-protocol/react';
import { formatCompact } from '@/lib/utils';
import { VAULTS, type VaultId } from '@/lib/yo';
import { DepositModal } from '@/components/modals/DepositModal';
import { RedeemModal } from '@/components/modals/RedeemModal';
import { useAccount } from 'wagmi';


interface VaultCardProps {
  vaultId: VaultId;
}

function ApyRing({ value, size = 90, id }: { value: number; size?: number; id: string }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / 20, 1);
  const offset = circumference - progress * circumference;
  const gradId = `apyGrad-${id}`;

  return (
    <div className="relative apy-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          className="text-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E676" />
            <stop offset="100%" stopColor="#00C853" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base sm:text-lg font-bold text-text-primary font-mono leading-none">
          {value.toFixed(0)}%
        </span>
        <span className="text-[8px] text-text-dim uppercase tracking-wider mt-0.5">APY</span>
      </div>
    </div>
  );
}

export function VaultCard({ vaultId }: VaultCardProps) {
  const vault = VAULTS[vaultId];
  const { vaults: sdkVaults, isLoading } = useVaults();
  const { prices } = usePrices();
  const { address } = useAccount();
  const [depositOpen, setDepositOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const sdkVault = sdkVaults?.find(
    (v) => v.id === vaultId || v.contracts?.vaultAddress?.toLowerCase() === vault.address.toLowerCase()
  );
  const apy = sdkVault?.yield?.['7d'] ? parseFloat(sdkVault.yield['7d']) : 0;

  const tvlUsd = useMemo(() => {
    if (!sdkVault?.tvl?.formatted) return 0;
    const tokenAmount = parseFloat(String(sdkVault.tvl.formatted));
    if (isNaN(tokenAmount)) return 0;
    const cgId = sdkVault.asset?.coingeckoId;
    const tokenPrice = cgId && prices?.[cgId] ? prices[cgId] : 1;
    return tokenAmount * tokenPrice;
  }, [sdkVault, prices]);

  return (
    <>
      <div className="group relative bg-surface-2 border border-white/[0.04] hover:border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-300">
        {/* Green gradient top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-accent/[0.04] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative p-3 sm:p-5">
          {/* Header: icon + name */}
          <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-3 border border-white/[0.06] flex items-center justify-center text-sm sm:text-lg shrink-0">
              {vault.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-text-primary leading-tight truncate">
                {vault.asset} <span className="text-text-dim">({vault.displayName.split(' ')[0]})</span>
              </h3>
              <p className="text-[10px] text-text-dim">Available to withdraw</p>
            </div>
          </div>

          {/* Quick percentage buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-3 sm:mb-5">
            {['10%', '25%', '50%', '100%'].map((pct) => (
              <button
                key={pct}
                onClick={() => setDepositOpen(true)}
                className="flex-1 py-1 rounded-md text-[10px] font-medium bg-surface-3 border border-white/[0.04] text-text-secondary hover:text-text-primary hover:border-white/[0.08] transition-all text-center"
              >
                {pct}
              </button>
            ))}
          </div>

          {/* APY Ring */}
          <div className="flex items-center justify-center mb-3 sm:mb-5">
            {isLoading ? (
              <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] shimmer rounded-full shrink-0" />
            ) : (
              <ApyRing value={apy} size={80} id={vaultId} />
            )}
          </div>

          {/* Balance display */}
          <div className="text-center mb-3 sm:mb-4">
            <p className="text-sm sm:text-lg font-mono font-semibold text-text-primary tracking-tight">
              0.00000000
            </p>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5">{vault.asset}</p>
          </div>

          {/* TVL bar */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-text-dim pt-2.5 sm:pt-3 border-t border-white/[0.04]">
            <span>TVL</span>
            <span className="font-mono text-text-secondary">{isLoading ? '...' : formatCompact(tvlUsd)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            <button
              onClick={() => setDepositOpen(true)}
              className="flex-1 bg-accent hover:bg-accent-hover text-black font-medium py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs transition-all active:scale-[0.97]"
            >
              Deposit
            </button>
            <button
              onClick={() => setRedeemOpen(true)}
              disabled={!address}
              className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-text-primary font-medium py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      <DepositModal
        vaultId={vaultId}
        open={depositOpen}
        onOpenChange={setDepositOpen}
      />
      <RedeemModal
        vaultId={vaultId}
        open={redeemOpen}
        onOpenChange={setRedeemOpen}
      />
    </>
  );
}
