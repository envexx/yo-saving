import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';
import { runAgentForUser } from '@/lib/agent-executor';
import { VAULTS } from '@/lib/yo';
import type { VaultSnapshot } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await agentStore.getAllActiveAddresses();
  console.log(`[Cron] Running agent for ${addresses.length} users`);

  // Build vault snapshots from static config (cron doesn't have SDK access)
  const vaultSnapshots: VaultSnapshot[] = Object.values(VAULTS).map(v => ({
    id: v.id,
    name: v.name,
    apy: 0,
    tvlUsd: 0,
    asset: v.asset,
    risk: v.risk,
  }));

  // Try fetching live data from YO API
  try {
    const vaultRes = await fetch('https://api.yo.xyz/v1/vaults?chainId=8453', {
      next: { revalidate: 0 },
    });
    if (vaultRes.ok) {
      const vaultData = await vaultRes.json();
      if (Array.isArray(vaultData.vaults)) {
        for (const liveVault of vaultData.vaults) {
          const snap = vaultSnapshots.find(s => s.id === liveVault.id);
          if (snap) {
            snap.apy = liveVault.yield?.['7d'] ? parseFloat(liveVault.yield['7d']) : 0;
            snap.tvlUsd = liveVault.tvl?.usd ? parseFloat(liveVault.tvl.usd) : 0;
          }
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Failed to fetch live vault data:', err);
  }

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      const state = await agentStore.getState(address);
      if (!state || !state.rules.enabled) return;

      state.lastRunAt = Date.now();
      await agentStore.saveState(state);

      return runAgentForUser(state, vaultSnapshots);
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  return NextResponse.json({ processed: addresses.length, succeeded });
}
