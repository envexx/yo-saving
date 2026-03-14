'use client';

import { useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { VAULTS, YO_GATEWAY } from '@/lib/yo';

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

const TOKEN_META: Record<string, { name: string; version: string }> = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { name: 'USD Coin', version: '2' },
  '0x4200000000000000000000000000000000000006': { name: 'Wrapped Ether', version: '1' },
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { name: 'Coinbase Wrapped BTC', version: '2' },
  '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': { name: 'EURC', version: '2' },
};

export function usePermitSign() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const signAgentPermit = useCallback(async (vaultId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');

    const vault = VAULTS[vaultId as keyof typeof VAULTS];
    if (!vault) throw new Error('Invalid vault');

    const tokenAddress = (vault.depositTokens as Record<number, string>)[8453];
    if (!tokenAddress) throw new Error('Token not available on Base');

    const meta = TOKEN_META[tokenAddress.toLowerCase()];
    if (!meta) throw new Error('Token permit metadata not found');

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    // Read current nonce from token contract
    let nonce = 0n;
    try {
      nonce = await walletClient.request({
        method: 'eth_call' as never,
        params: [{
          to: tokenAddress as `0x${string}`,
          data: `0x7ecebe00000000000000000000000000${address.slice(2).toLowerCase()}` as `0x${string}`,
        }, 'latest'] as never,
      }) as unknown as bigint;
      nonce = BigInt(nonce);
    } catch {
      nonce = 0n;
    }

    // Sign ERC-2612 permit via EIP-712 typed data (no gas!)
    const signature = await walletClient.signTypedData({
      account: address,
      domain: {
        name: meta.name,
        version: meta.version,
        chainId: 8453,
        verifyingContract: tokenAddress as `0x${string}`,
      },
      types: {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner: address,
        spender: YO_GATEWAY as `0x${string}`,
        value: MAX_UINT256,
        nonce,
        deadline,
      },
    });

    // Split signature into v, r, s
    const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
    const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
    const v = parseInt(signature.slice(130, 132), 16);

    return {
      deadline: deadline.toString(),
      v,
      r,
      s,
      amount: MAX_UINT256.toString(),
      tokenAddress,
      chainId: 8453,
    };
  }, [walletClient, address]);

  return { signAgentPermit };
}
