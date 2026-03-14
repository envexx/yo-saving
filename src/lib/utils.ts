import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCompact(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0.00';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value);
}

export function formatTVL(tvl: { raw?: string | number; formatted?: string } | undefined): string {
  if (!tvl) return '$0.00';
  // Prefer the SDK's pre-formatted string
  if (tvl.formatted) {
    const num = parseFloat(String(tvl.formatted).replace(/[^0-9.\-]/g, ''));
    if (!isNaN(num) && isFinite(num)) {
      return formatCompact(num);
    }
  }
  // Fallback to raw
  if (tvl.raw !== undefined) {
    const num = parseFloat(String(tvl.raw));
    if (!isNaN(num) && isFinite(num)) {
      return formatCompact(num);
    }
  }
  return '$0.00';
}

export function getExplorerUrl(hash: string, chainId: number = 8453): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    1: 'https://etherscan.io',
    42161: 'https://arbiscan.io',
  };
  const base = explorers[chainId] || explorers[8453];
  return `${base}/tx/${hash}`;
}
