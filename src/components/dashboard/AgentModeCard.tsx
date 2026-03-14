'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { usePermitSign } from '@/hooks/usePermitSign';
import { AgentActivityFeed } from './AgentActivityFeed';
import { Bot, Zap, Shield, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const VAULT_OPTIONS = [
  { id: 'yoUSD', label: 'USD', icon: '💵' },
  { id: 'yoETH', label: 'ETH', icon: '⟠' },
  { id: 'yoBTC', label: 'BTC', icon: '₿' },
  { id: 'yoEUR', label: 'EUR', icon: '€' },
];

export function AgentModeCard() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: agentStatus, isLoading: statusLoading } = useAgentStatus();
  const { signAgentPermit } = usePermitSign();
  const queryClient = useQueryClient();

  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rules state (for inactive mode)
  const [minApyDiff, setMinApyDiff] = useState(0.5);
  const [selectedVaults, setSelectedVaults] = useState<string[]>(['yoUSD', 'yoETH', 'yoEUR']);

  const isActive = agentStatus?.enabled ?? false;
  const state = agentStatus?.state;
  const actions = agentStatus?.recentActions ?? [];

  const toggleVault = (id: string) => {
    setSelectedVaults(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleEnable = useCallback(async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }
    if (selectedVaults.length === 0) {
      setError('Select at least one vault');
      return;
    }

    setEnabling(true);
    setError(null);

    try {
      // Sign permit for the first selected vault (USDC preferred)
      const primaryVault = selectedVaults.includes('yoUSD') ? 'yoUSD' : selectedVaults[0];
      const permit = await signAgentPermit(primaryVault);

      const res = await fetch('/api/agent/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          permit,
          rules: {
            minApyDiffPercent: minApyDiff,
            maxSlippageBps: 50,
            preferredVaults: selectedVaults,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to enable agent');

      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable agent');
    } finally {
      setEnabling(false);
    }
  }, [address, openConnectModal, signAgentPermit, selectedVaults, minApyDiff, queryClient]);

  const handleDisable = useCallback(async () => {
    if (!address) return;
    setDisabling(true);

    try {
      await fetch('/api/agent/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address }),
      });
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    } catch {
      setError('Failed to disable agent');
    } finally {
      setDisabling(false);
    }
  }, [address, queryClient]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'border-accent/30 bg-[#0A0A0A]'
          : 'border-white/[0.06] bg-surface-2'
      }`}
    >
      {/* Subtle glow for active state */}
      {isActive && (
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/[0.06] rounded-full blur-[80px]" />
      )}

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isActive ? 'bg-accent/20' : 'bg-white/[0.06]'
            }`}>
              <Bot className={`w-4.5 h-4.5 ${isActive ? 'text-accent' : 'text-text-secondary'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">AI Agent Mode</h3>
              <p className="text-[11px] text-text-dim">Auto-optimize your savings with AI</p>
            </div>
          </div>

          {/* Status badge */}
          {statusLoading ? (
            <div className="h-6 w-16 rounded-full shimmer" />
          ) : isActive ? (
            <div className="flex items-center gap-1.5 bg-accent/20 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-text-dim" />
              <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">Off</span>
            </div>
          )}
        </div>

        {/* Active state: stats + activity feed */}
        {isActive && state && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-lg font-bold font-mono text-text-primary">{state.totalActionsCount}</p>
                <p className="text-[10px] text-text-dim mt-0.5">Actions taken</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-lg font-bold font-mono text-accent">
                  +${state.totalYieldOptimizedUsd.toFixed(2)}<span className="text-xs text-text-dim">/yr</span>
                </p>
                <p className="text-[10px] text-text-dim mt-0.5">Yield optimized</p>
              </div>
            </div>

            {/* Activity feed */}
            <div className="mb-4">
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Recent Activity</p>
              <AgentActivityFeed actions={actions} />
            </div>

            {/* Disable button */}
            <button
              onClick={handleDisable}
              disabled={disabling}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-text-secondary font-medium py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {disabling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable Agent'
              )}
            </button>
          </>
        )}

        {/* Inactive state: rules + enable */}
        {!isActive && (
          <>
            {/* Features */}
            <div className="flex items-center gap-4 mb-5 py-3 px-3 bg-white/[0.02] rounded-xl">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-[10px] text-text-secondary">No gas to sign</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-accent" />
                <span className="text-[10px] text-text-secondary">Cancel anytime</span>
              </div>
            </div>

            {/* Min APY difference slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-text-dim uppercase tracking-wider">Min APY Difference</label>
                <span className="text-xs font-mono text-text-primary">{minApyDiff.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={minApyDiff}
                onChange={(e) => setMinApyDiff(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-[#00E676] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Vault selection */}
            <div className="mb-5">
              <label className="text-[11px] text-text-dim uppercase tracking-wider mb-2 block">Allow Vaults</label>
              <div className="flex gap-2">
                {VAULT_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggleVault(v.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                      selectedVaults.includes(v.id)
                        ? 'bg-accent/15 border border-accent/30 text-accent'
                        : 'bg-white/[0.03] border border-white/[0.04] text-text-dim hover:text-text-secondary'
                    }`}
                  >
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 mb-3">
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            )}

            {/* Enable button */}
            <button
              onClick={handleEnable}
              disabled={enabling || !address}
              className="w-full bg-accent hover:bg-accent-hover text-black font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enabling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing permit... (no gas fee)
                </>
              ) : !address ? (
                'Connect Wallet First'
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Enable Agent Mode
                </>
              )}
            </button>
            <p className="text-[10px] text-text-dim text-center mt-2">
              Sign once. No gas. Cancel anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
