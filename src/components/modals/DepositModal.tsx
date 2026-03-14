'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDeposit, usePrices } from '@yo-protocol/react';
import { useAccount, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VAULTS, type VaultId } from '@/lib/yo';
import { getExplorerUrl } from '@/lib/utils';
import { parseUnits } from 'viem';
import { ExternalLink, X, Check, ArrowUpDown } from 'lucide-react';
import { VaultIcon } from '@/components/ui/VaultIcon';

type Denomination = 'token' | 'usd';

interface DepositModalProps {
  vaultId: VaultId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositModal({ vaultId, open, onOpenChange }: DepositModalProps) {
  const vault = VAULTS[vaultId];
  const { address } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const [amount, setAmount] = useState('');
  const [denomination, setDenomination] = useState<Denomination>('token');
  const { prices } = usePrices();

  const tokenPrice = useMemo(() => {
    const cgId = vault.coingeckoId;
    return cgId && prices?.[cgId] ? prices[cgId] : 0;
  }, [vault.coingeckoId, prices]);

  // Whether this vault's native token is already USD-pegged (USDC, EURC)
  const isStablecoin = vault.asset === 'USDC' || vault.asset === 'EURC';

  // Convert display amount to actual token amount for the contract
  const tokenAmount = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '';
    if (denomination === 'token' || isStablecoin) return amount;
    if (!tokenPrice || tokenPrice <= 0) return '';
    return (parseFloat(amount) / tokenPrice).toFixed(vault.decimals > 8 ? 10 : 8);
  }, [amount, denomination, tokenPrice, isStablecoin, vault.decimals]);

  // The equivalent in the other denomination (shown as hint)
  const equivalentDisplay = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || !tokenPrice || isStablecoin) return null;
    if (denomination === 'token') {
      const usd = parseFloat(amount) * tokenPrice;
      return `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      const tokens = parseFloat(amount) / tokenPrice;
      return `≈ ${tokens.toFixed(vault.decimals > 8 ? 8 : 6)} ${vault.asset}`;
    }
  }, [amount, denomination, tokenPrice, isStablecoin, vault.asset, vault.decimals]);

  const { deposit, step, isLoading, isSuccess, hash, error, reset } = useDeposit({
    vault: vaultId,
    slippageBps: 50,
    onSubmitted: (h) => console.log('[Deposit] Submitted:', h),
    onConfirmed: (h) => console.log('[Deposit] Confirmed:', h),
    onError: (err) => console.error('[Deposit] Error:', err),
  });

  const selectedChainId = (vault.chains as readonly number[]).includes(chainId) ? chainId : vault.chains[0];
  const depositToken = (vault.depositTokens as Record<number, string>)[selectedChainId] ?? (vault.depositTokens as Record<number, string>)[vault.chains[0]];

  const handleDeposit = useCallback(async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }
    const finalAmount = tokenAmount;
    if (!finalAmount || parseFloat(finalAmount) <= 0) return;
    try {
      const parsedAmount = parseUnits(finalAmount, vault.decimals);
      await deposit({
        token: depositToken as `0x${string}`,
        amount: parsedAmount,
        chainId: selectedChainId,
      });
    } catch (err) {
      console.error('[Deposit] Failed:', err);
    }
  }, [address, tokenAmount, deposit, depositToken, openConnectModal, selectedChainId, vault.decimals]);

  const toggleDenomination = () => {
    if (isStablecoin) return;
    if (!tokenPrice || tokenPrice <= 0) return;
    // Convert current amount to the other denomination
    const val = parseFloat(amount);
    if (amount && !isNaN(val) && val > 0) {
      if (denomination === 'token') {
        setAmount((val * tokenPrice).toFixed(2));
      } else {
        setAmount((val / tokenPrice).toFixed(vault.decimals > 8 ? 10 : 8));
      }
    }
    setDenomination(d => d === 'token' ? 'usd' : 'token');
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount('');
      setDenomination('token');
      reset();
      onOpenChange(false);
    }
  };

  const inputLabel = denomination === 'usd' ? 'Amount (USD):' : `Amount (${vault.asset}):`;
  const inputPlaceholder = denomination === 'usd' ? '0.00 USD' : '0.00';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="bg-surface-2 border-white/[0.06] !max-w-[calc(100%-1.5rem)] sm:!max-w-[400px] w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-3 sm:pb-4 border-b border-white/[0.04]">
          <DialogTitle className="text-base font-semibold text-text-primary">Deposit</DialogTitle>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Progress steps */}
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
                <p className="text-sm font-semibold text-text-primary">Deposit Successful</p>
                <p className="text-xs text-text-dim mt-1">Your {vault.asset} is earning yield</p>
              </div>
              <a
                href={getExplorerUrl(hash, selectedChainId)}
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
              {error && step === 'error' && (
                <div className="bg-danger/5 border border-danger/10 rounded-xl p-3 overflow-hidden">
                  <p className="text-xs text-danger break-words line-clamp-3">
                    {error.message?.length && error.message.length > 120
                      ? error.message.slice(0, 120) + '…'
                      : error.message || 'Transaction failed.'}
                  </p>
                </div>
              )}

              {/* Amount section */}
              <div>
                <label className="text-[11px] text-text-dim uppercase tracking-wider mb-2 block">{inputLabel}</label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    {denomination === 'usd' && (
                      <span className="text-xl sm:text-3xl font-semibold text-text-dim/50">$</span>
                    )}
                    <input
                      type="number"
                      placeholder={inputPlaceholder}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-transparent text-xl sm:text-3xl font-semibold font-mono text-text-primary placeholder:text-text-dim/30 focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Token info + denomination toggle */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-xs">
                    <VaultIcon icon={vault.icon} size={16} />
                  </div>
                  <span className="text-sm font-medium text-text-secondary">{vault.asset}</span>

                  {/* Equivalent display */}
                  {equivalentDisplay && (
                    <span className="text-[10px] text-text-dim ml-1">{equivalentDisplay}</span>
                  )}

                  {/* Toggle button — only for non-stablecoins */}
                  {!isStablecoin && tokenPrice > 0 && (
                    <button
                      onClick={toggleDenomination}
                      disabled={isLoading}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all disabled:opacity-40"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {denomination === 'token' ? 'USD' : vault.asset}
                    </button>
                  )}

                  {isStablecoin && (
                    <span className="text-[10px] text-text-dim ml-auto whitespace-nowrap">Min 0.00001</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.04]" />

              {/* Wallet address preview */}
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
                onClick={!address ? () => openConnectModal?.() : handleDeposit}
                disabled={isLoading || (!!address && (!tokenAmount || parseFloat(tokenAmount) <= 0))}
                className="w-full bg-white text-black font-medium py-3.5 rounded-xl text-sm transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {!address ? (
                  'Connect Wallet'
                ) : isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Deposit ●</>
                )}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
