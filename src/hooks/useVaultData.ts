'use client';

import { useVaults, useUserPosition } from '@yo-protocol/react';
import { VAULTS, type VaultId } from '@/lib/yo';
import { useAccount } from 'wagmi';

export function useVaultData() {
  const { address } = useAccount();
  const { vaults: sdkVaults, isLoading } = useVaults();

  const vaultList = Object.entries(VAULTS).map(([id, config]) => {
    const sdkVault = sdkVaults?.find(
      (v) => v.id === id || v.contracts?.vaultAddress?.toLowerCase() === config.address.toLowerCase()
    );
    const apy7d = sdkVault?.yield?.['7d'] ? parseFloat(sdkVault.yield['7d']) : 0;
    const tvl = sdkVault?.tvl?.raw ? parseFloat(String(sdkVault.tvl.raw)) : 0;

    return {
      ...config,
      vaultId: id as VaultId,
      apy: apy7d,
      tvl,
      sdkVault,
    };
  });

  return {
    vaults: vaultList,
    isLoading,
    isConnected: !!address,
    address,
  };
}

export function useUserVaultPosition(vaultId: VaultId) {
  const { address } = useAccount();
  const { position, isLoading } = useUserPosition(vaultId, address);

  return {
    assets: position?.assets ?? 0n,
    shares: position?.shares ?? 0n,
    isLoading,
    hasPosition: (position?.assets ?? 0n) > 0n,
  };
}
