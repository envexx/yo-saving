'use client';

import { useState, useCallback } from 'react';
import { useRedeem, useShareBalance } from '@yo-protocol/react';
import { useAccount } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VAULTS, type VaultId } from '@/lib/yo';
import { getExplorerUrl } from '@/lib/utils';
import { parseUnits, formatUnits } from 'viem';
import { ExternalLink, X, Check, Clock } from 'lucide-react';
import { VaultIcon } from '@/components/ui/VaultIcon';

interface RedeemModalProps {
  vaultId: VaultId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedeemModal({ vaultId, open, onOpenChange }: RedeemModalProps) {
  const vault = VAULTS[vaultId];
  const { address } = useAccount();
  const { shares: userShares } = useShareBalance(vaultId, address);
  const [amount, setAmount] = useState('');

  const { redeem, step, isLoading, isSuccess, hash, error, instant, reset } = useRedeem({
    vault: vaultId,
    onSubmitted: (h) => console.log('[Redeem] Submitted:', h),
    onConfirmed: (h) => console.log('[Redeem] Confirmed:', h),
    onError: (err) => console.error('[Redeem] Error:', err),
  });

  const handleRedeem = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const parsedShares = parseUnits(amount, vault.decimals);
      await redeem(parsedShares);
    } catch (err) {
      console.error('[Redeem] Failed:', err);
    }
  }, [amount, redeem, vault.decimals]);

  const handleMax = () => {
    if (userShares) {
      setAmount(formatUnits(userShares, vault.decimals));
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount('');
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="bg-surface-2 border-white/[0.06] !max-w-[calc(100%-1.5rem)] sm:!max-w-[400px] w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-3 sm:pb-4 border-b border-white/[0.04]">
          <DialogTitle className="text-base font-semibold text-text-primary">Withdraw</DialogTitle>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Progress */}
          {step !== 'idle' && !isSuccess && (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary capitalize">{step}...</span>
            </div>
          )}

          {/* Success */}
          {isSuccess && hash ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Withdrawal Complete</p>
                {instant === false && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-warning">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">Queued — up to 24h to process</span>
                  </div>
                )}
                {instant === true && (
                  <p className="text-xs text-text-dim mt-1">Funds returned instantly</p>
                )}
              </div>
              <a
                href={getExplorerUrl(hash, vault.chains[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                View tx <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={handleClose}
                className="w-full bg-white text-black font-medium py-3 rounded-xl text-sm transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="bg-danger/5 border border-danger/10 rounded-xl p-3">
                  <p className="text-xs text-danger">{error.message || 'Transaction failed.'}</p>
                </div>
              )}

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-text-dim uppercase tracking-wider">Amount:</label>
                  {userShares !== undefined && (
                    <button onClick={handleMax} className="text-[10px] text-accent hover:text-accent-hover transition-colors">
                      Max {parseFloat(formatUnits(userShares, vault.decimals)).toFixed(4)} {vault.asset}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-transparent text-xl sm:text-3xl font-semibold font-mono text-text-primary placeholder:text-text-dim/30 focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs">
                    <VaultIcon icon={vault.icon} size={16} />
                  </div>
                  <span className="text-sm font-medium text-text-secondary">{vault.asset}</span>
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Wallet */}
              {address && (
                <div>
                  <label className="text-[11px] text-text-dim uppercase tracking-wider mb-2 block">Your Wallet:</label>
                  <div className="flex items-center gap-2 bg-surface-3 rounded-xl px-3 py-2.5 overflow-hidden">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    </div>
                    <span className="text-[11px] font-mono text-text-secondary truncate min-w-0">{address}</span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleRedeem}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="w-full bg-white text-black font-medium py-3.5 rounded-xl text-sm transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Withdraw ●</>
                )}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
