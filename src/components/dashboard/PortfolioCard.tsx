'use client';

import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useUserPositions, useVaults } from '@yo-protocol/react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

export function PortfolioCard() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { vaults, isLoading: vaultsLoading } = useVaults();
  const { positions, isLoading: positionsLoading } = useUserPositions(address);

  const bestApy = vaults?.reduce((max, v) => {
    const apy = v?.yield?.['7d'] ? parseFloat(v.yield['7d']) : 0;
    return apy > max ? apy : max;
  }, 0) ?? 0;

  const totalAssets = positions?.reduce((sum, p) => {
    const assets = p.position?.assets ? Number(p.position.assets) : 0;
    return sum + assets;
  }, 0) ?? 0;

  const activeCount = positions?.filter((p) => {
    const assets = p.position?.assets ? Number(p.position.assets) : 0;
    return assets > 0;
  }).length ?? 0;

  if (!address) {
    return (
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.06]">
        <div className="relative bg-[#0A0A0A] p-5 sm:p-8 overflow-hidden">
          {/* Subtle green glow blobs */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#00E676]/[0.12] rounded-full blur-[80px]" />
          <div className="absolute -bottom-10 right-10 w-36 h-36 bg-[#00E676]/[0.06] rounded-full blur-[60px]" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-sm rounded-full px-3 py-1">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-text-secondary">Yearly Return</span>
              </div>
              <h2 className="text-2xl sm:text-5xl font-bold text-text-primary tracking-tight">
                {vaultsLoading ? (
                  <span className="opacity-50">—</span>
                ) : (
                  <>{bestApy.toFixed(2)}%</>
                )}
              </h2>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-text-dim" />
                  <span className="text-xs sm:text-sm text-text-secondary">Daily: <span className="font-semibold text-text-primary">+0.014%</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-text-dim" />
                  <span className="text-xs sm:text-sm text-text-secondary">Monthly: <span className="font-semibold text-text-primary">+{(bestApy / 12).toFixed(2)}%</span></span>
                </div>
              </div>
            </div>
            <button
              onClick={() => openConnectModal?.()}
              className="bg-accent text-black font-medium px-6 py-3 rounded-full text-sm transition-all hover:bg-accent-hover active:scale-95 w-full sm:w-auto text-center"
            >
              Connect Wallet →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.06]">
      <div className="relative bg-[#0A0A0A] p-5 sm:p-8 overflow-hidden">
        {/* Subtle green glow blobs */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#00E676]/[0.12] rounded-full blur-[80px]" />
        <div className="absolute -bottom-10 right-10 w-36 h-36 bg-[#00E676]/[0.06] rounded-full blur-[60px]" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-sm rounded-full px-3 py-1 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-text-secondary">Yearly Return</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="text-2xl sm:text-5xl font-bold text-text-primary tracking-tight">
                {positionsLoading ? (
                  <span className="opacity-50">$0.00</span>
                ) : (
                  <>$<NumberTicker value={totalAssets / 1e6} decimalPlaces={2} className="text-text-primary" /></>
                )}
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-6 mt-2 sm:mt-3">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-text-dim" />
                  <span className="text-xs sm:text-sm text-text-secondary">Daily: <span className="font-semibold text-text-primary">+${((totalAssets / 1e6) * (bestApy / 100 / 365)).toFixed(4)}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-text-dim" />
                  <span className="text-xs sm:text-sm text-text-secondary">Active: <span className="font-semibold text-text-primary">{String(activeCount)} {activeCount === 1 ? 'account' : 'accounts'}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BorderBeam size={200} duration={8} colorFrom="#00E67640" colorTo="#00E67610" />
    </div>
  );
}
