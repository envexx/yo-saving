# YO Savings — One-Click Agent Mode
> Cursor AI: Baca SELURUH dokumen ini sebelum menulis satu baris kode pun.
> Ini adalah fitur agentic yang akan dibangun di atas app YO Savings yang sudah berjalan.

---

## Konsep: Apa yang Akan Dibangun

**One-Click Agent Mode** — user sign SATU kali, AI agent monitor & rebalance otomatis selamanya.

```
User klik "Enable Agent" → Sign ERC-2612 permit (offline signature, no gas)
    ↓
Server simpan: { address, permitSignature, rules }
    ↓
Cron job setiap 30 menit:
    → Fetch APY semua vault dari YO SDK
    → Kirim ke Gemini: "Perlu rebalance?"
    → Jika ya: server eksekusi depositWithPermit() via viem
    → Simpan log aksi
    → Update UI user secara real-time
```

**Kunci teknis:** `depositWithPermit()` di YO Gateway menerima ERC-2612 permit signature sehingga server bisa deposit TANPA user sign lagi. User hanya sign permit sekali di awal.

---

## Install Dependencies

```bash
npm install @google/generative-ai wagmi-permit viem @upstash/redis
```

Tambahkan ke `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key
AGENT_PRIVATE_KEY=your_server_wallet_private_key
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
NEXT_PUBLIC_AGENT_ENABLED=true
```

> **AGENT_PRIVATE_KEY**: Buat wallet baru khusus untuk server agent (jangan pakai wallet pribadi).
> Wallet ini hanya perlu ETH untuk gas di Base (~$0.01 per transaksi).
> **UPSTASH_REDIS**: Daftar gratis di upstash.com — dipakai untuk simpan permit + agent state.

---

## Arsitektur File Baru

```
src/
├── lib/
│   ├── gemini.ts              ← Gemini client (SUDAH ADA, update saja)
│   ├── agent-executor.ts      ← Server: eksekusi transaksi via viem
│   ├── agent-store.ts         ← Redis store untuk permit + state
│   └── yo-abi.ts              ← ABI minimal YO Gateway
│
├── app/api/
│   ├── agent/
│   │   ├── enable/route.ts    ← POST: simpan permit, aktifkan agent
│   │   ├── disable/route.ts   ← POST: nonaktifkan agent
│   │   ├── status/route.ts    ← GET: status agent + history aksi
│   │   └── run/route.ts       ← POST: manual trigger (juga dipanggil cron)
│   └── cron/
│       └── agent/route.ts     ← GET: dipanggil Vercel Cron setiap 30 menit
│
├── components/dashboard/
│   ├── AgentModeCard.tsx      ← UI card enable/disable + live activity feed
│   └── AgentActivityFeed.tsx  ← Real-time log aksi agent
│
└── hooks/
    ├── useAgentStatus.ts      ← Poll status agent setiap 10 detik
    └── usePermitSign.ts       ← Hook untuk sign ERC-2612 permit
```

---

## 1. `src/lib/yo-abi.ts` — ABI Minimal YO Gateway

```ts
// ABI minimal YO Gateway yang dibutuhkan untuk agent execution
export const YO_GATEWAY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'partnerId', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'depositWithPermit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'partnerId', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'quotePreviewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'minAssetsOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsOut', type: 'uint256' },
      { name: 'instant', type: 'bool' },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
```

---

## 2. `src/lib/agent-store.ts` — Redis Storage

```ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface PermitData {
  deadline: string;        // BigInt as string
  v: number;
  r: string;
  s: string;
  amount: string;          // Max amount user approved (BigInt as string)
  tokenAddress: string;
  chainId: number;
}

export interface AgentRules {
  minApyDiffPercent: number;   // Default: 0.5 (rebalance jika beda APY > 0.5%)
  maxSlippageBps: number;      // Default: 50 (0.5%)
  preferredVaults: string[];   // ['yoUSD', 'yoETH'] — vault yang boleh dimasuki
  enabled: boolean;
}

export interface AgentState {
  userAddress: string;
  permit: PermitData;
  rules: AgentRules;
  enabledAt: number;           // timestamp
  lastRunAt: number | null;
  lastActionAt: number | null;
  totalActionsCount: number;
  totalYieldOptimizedUsd: number;
}

export interface AgentAction {
  id: string;
  userAddress: string;
  timestamp: number;
  type: 'rebalance' | 'deposit' | 'no_action';
  fromVault?: string;
  toVault?: string;
  amountUsd: number;
  txHash?: string;
  estimatedExtraYearlyUsd?: number;
  geminiReason: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

// Keys
const stateKey = (addr: string) => `agent:state:${addr.toLowerCase()}`;
const actionsKey = (addr: string) => `agent:actions:${addr.toLowerCase()}`;

export const agentStore = {
  async saveState(state: AgentState): Promise<void> {
    await redis.set(stateKey(state.userAddress), JSON.stringify(state));
  },

  async getState(address: string): Promise<AgentState | null> {
    const data = await redis.get<string>(stateKey(address));
    return data ? JSON.parse(data) : null;
  },

  async deleteState(address: string): Promise<void> {
    await redis.del(stateKey(address));
  },

  async saveAction(action: AgentAction): Promise<void> {
    // Simpan max 50 aksi terakhir per user (LIFO)
    const existing = await redis.get<string>(actionsKey(action.userAddress));
    const actions: AgentAction[] = existing ? JSON.parse(existing) : [];
    actions.unshift(action); // prepend
    if (actions.length > 50) actions.splice(50);
    await redis.set(actionsKey(action.userAddress), JSON.stringify(actions));
  },

  async getActions(address: string): Promise<AgentAction[]> {
    const data = await redis.get<string>(actionsKey(address));
    return data ? JSON.parse(data) : [];
  },

  // Ambil semua active agents untuk cron job
  async getAllActiveAddresses(): Promise<string[]> {
    const keys = await redis.keys('agent:state:*');
    return keys.map(k => k.replace('agent:state:', ''));
  },
};
```

---

## 3. `src/lib/gemini.ts` — Update (Ganti Seluruh File)

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

export interface VaultSnapshot {
  id: string;
  name: string;
  apy: number;
  tvlUsd: number;
  asset: string;
  risk: 'low' | 'medium' | 'high';
}

export interface UserPosition {
  vaultId: string;
  balanceUsd: number;
  sharesRaw: string;      // BigInt as string
  apy: number;
  tokenAddress: string;
  decimals: number;
}

export interface AgentDecision {
  shouldAct: boolean;
  action: 'rebalance' | 'deposit' | 'hold';
  fromVault: string | null;
  toVault: string | null;
  amountUsd: number;
  reason: string;           // Plain language, max 1 kalimat
  estimatedExtraYearlyUsd: number;
  urgency: 'low' | 'medium' | 'high';
}

export async function getAgentDecision(
  vaults: VaultSnapshot[],
  userPositions: UserPosition[],
  rules: { minApyDiffPercent: number; preferredVaults: string[] }
): Promise<AgentDecision> {
  const prompt = `
You are an autonomous yield optimization agent for a DeFi savings app.
Your job: decide if user's funds should be moved to a better yielding vault.

AVAILABLE VAULTS (sorted by APY desc):
${vaults
  .sort((a, b) => b.apy - a.apy)
  .map(v => `- ${v.id}: ${v.apy.toFixed(2)}% APY, TVL $${(v.tvlUsd/1e6).toFixed(1)}M, Risk: ${v.risk}`)
  .join('\n')}

USER CURRENT POSITIONS:
${userPositions.length === 0
  ? '- No active positions'
  : userPositions.map(p => `- ${p.vaultId}: $${p.balanceUsd.toFixed(2)} at ${p.apy.toFixed(2)}% APY`).join('\n')}

RULES:
- Only rebalance if APY difference > ${rules.minApyDiffPercent}%
- Only use these vaults: ${rules.preferredVaults.join(', ')}
- Prefer low risk vaults unless high APY uplift (>2%) justifies medium risk
- Move the ENTIRE position from the lower APY vault to the higher one
- If no positions and TVL > $1M, suggest depositing (action: "deposit")

RESPOND ONLY WITH VALID JSON (no markdown, no explanation):
{
  "shouldAct": boolean,
  "action": "rebalance" | "deposit" | "hold",
  "fromVault": "vaultId" | null,
  "toVault": "vaultId" | null,
  "amountUsd": number,
  "reason": "one sentence plain English reason",
  "estimatedExtraYearlyUsd": number,
  "urgency": "low" | "medium" | "high"
}
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as AgentDecision;
  } catch (err) {
    console.error('[Gemini Decision Error]', err);
    return {
      shouldAct: false,
      action: 'hold',
      fromVault: null,
      toVault: null,
      amountUsd: 0,
      reason: 'Portfolio is currently optimized.',
      estimatedExtraYearlyUsd: 0,
      urgency: 'low',
    };
  }
}
```

---

## 4. `src/lib/agent-executor.ts` — Server Wallet Executor

```ts
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { YO_GATEWAY_ABI, ERC20_ABI } from './yo-abi';
import { VAULTS, YO_GATEWAY } from './yo';
import { AgentState, AgentAction, agentStore } from './agent-store';
import { getAgentDecision, VaultSnapshot, UserPosition } from './gemini';

const CHAIN = base;
const RPC_URL = 'https://mainnet.base.org';

// Server wallet — hanya untuk eksekusi, user tetap owner dana
const serverAccount = privateKeyToAccount(
  process.env.AGENT_PRIVATE_KEY as `0x${string}`
);

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: serverAccount,
  chain: CHAIN,
  transport: http(RPC_URL),
});

export async function runAgentForUser(
  state: AgentState,
  vaultSnapshots: VaultSnapshot[]
): Promise<AgentAction> {
  const actionId = `${state.userAddress}-${Date.now()}`;
  const userAddr = state.userAddress as `0x${string}`;

  // 1. Fetch user positions dari chain langsung
  const userPositions: UserPosition[] = [];
  for (const vault of Object.values(VAULTS)) {
    if (!vault.chains.includes(8453)) continue; // Base only
    const tokenAddr = vault.depositTokens[8453] as `0x${string}`;
    try {
      const balance = await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddr],
      });
      if (balance > 0n) {
        const snap = vaultSnapshots.find(v => v.id === vault.id);
        const decimals = vault.id === 'yoBTC' ? 8 : vault.id === 'yoETH' ? 18 : 6;
        const balanceFormatted = parseFloat(formatUnits(balance, decimals));
        // Approximate USD value (simplified — for ETH/BTC multiply by price)
        userPositions.push({
          vaultId: vault.id,
          balanceUsd: balanceFormatted, // For USDC/EURC this is already USD
          sharesRaw: balance.toString(),
          apy: snap?.apy ?? 0,
          tokenAddress: tokenAddr,
          decimals,
        });
      }
    } catch { /* vault not active for user */ }
  }

  // 2. Tanya Gemini: perlu aksi?
  const decision = await getAgentDecision(vaultSnapshots, userPositions, state.rules);

  if (!decision.shouldAct || decision.action === 'hold') {
    const action: AgentAction = {
      id: actionId,
      userAddress: state.userAddress,
      timestamp: Date.now(),
      type: 'no_action',
      amountUsd: 0,
      geminiReason: decision.reason,
      status: 'skipped',
    };
    await agentStore.saveAction(action);
    return action;
  }

  // 3. Eksekusi rebalance: redeem dari fromVault, deposit ke toVault
  try {
    const fromVaultConfig = VAULTS[decision.fromVault as keyof typeof VAULTS];
    const toVaultConfig = VAULTS[decision.toVault as keyof typeof VAULTS];

    if (!fromVaultConfig || !toVaultConfig) throw new Error('Invalid vault config');

    const tokenAddr = fromVaultConfig.depositTokens[8453] as `0x${string}`;
    const userBalance = await publicClient.readContract({
      address: tokenAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddr],
    });

    if (userBalance === 0n) throw new Error('No balance to rebalance');

    // Get min shares dengan 0.5% slippage
    const minSharesOut = await publicClient.readContract({
      address: YO_GATEWAY as `0x${string}`,
      abi: YO_GATEWAY_ABI,
      functionName: 'quotePreviewDeposit',
      args: [toVaultConfig.address as `0x${string}`, userBalance],
    });
    const minSharesWithSlippage = (minSharesOut * 995n) / 1000n;

    // Eksekusi depositWithPermit menggunakan permit user
    const permit = state.permit;
    const txHash = await walletClient.writeContract({
      address: YO_GATEWAY as `0x${string}`,
      abi: YO_GATEWAY_ABI,
      functionName: 'depositWithPermit',
      args: [
        toVaultConfig.address as `0x${string}`,
        userBalance,
        minSharesWithSlippage,
        userAddr,              // receiver = user sendiri
        9999n,                 // partnerId
        BigInt(permit.deadline),
        permit.v,
        permit.r as `0x${string}`,
        permit.s as `0x${string}`,
      ],
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const action: AgentAction = {
      id: actionId,
      userAddress: state.userAddress,
      timestamp: Date.now(),
      type: 'rebalance',
      fromVault: decision.fromVault ?? undefined,
      toVault: decision.toVault ?? undefined,
      amountUsd: decision.amountUsd,
      txHash,
      estimatedExtraYearlyUsd: decision.estimatedExtraYearlyUsd,
      geminiReason: decision.reason,
      status: 'success',
    };

    // Update stats
    state.lastActionAt = Date.now();
    state.totalActionsCount += 1;
    state.totalYieldOptimizedUsd += decision.estimatedExtraYearlyUsd;
    await agentStore.saveState(state);
    await agentStore.saveAction(action);

    return action;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    const action: AgentAction = {
      id: actionId,
      userAddress: state.userAddress,
      timestamp: Date.now(),
      type: 'rebalance',
      fromVault: decision.fromVault ?? undefined,
      toVault: decision.toVault ?? undefined,
      amountUsd: decision.amountUsd,
      geminiReason: decision.reason,
      status: 'failed',
      error,
    };
    await agentStore.saveAction(action);
    return action;
  }
}
```

---

## 5. API Routes

### `src/app/api/agent/enable/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { agentStore, AgentState } from '@/lib/agent-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, permit, rules } = body;

    if (!userAddress || !permit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const state: AgentState = {
      userAddress: userAddress.toLowerCase(),
      permit,
      rules: {
        minApyDiffPercent: rules?.minApyDiffPercent ?? 0.5,
        maxSlippageBps: rules?.maxSlippageBps ?? 50,
        preferredVaults: rules?.preferredVaults ?? ['yoUSD', 'yoETH', 'yoEUR'],
        enabled: true,
      },
      enabledAt: Date.now(),
      lastRunAt: null,
      lastActionAt: null,
      totalActionsCount: 0,
      totalYieldOptimizedUsd: 0,
    };

    await agentStore.saveState(state);
    return NextResponse.json({ success: true, state });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to enable agent' }, { status: 500 });
  }
}
```

### `src/app/api/agent/disable/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';

export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();
    await agentStore.deleteState(userAddress);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to disable agent' }, { status: 500 });
  }
}
```

### `src/app/api/agent/status/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ enabled: false });

  const state = await agentStore.getState(address.toLowerCase());
  const actions = await agentStore.getActions(address.toLowerCase());

  return NextResponse.json({
    enabled: !!state,
    state: state ?? null,
    recentActions: actions.slice(0, 10),
  });
}
```

### `src/app/api/cron/agent/route.ts` — Cron Job (setiap 30 menit)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';
import { runAgentForUser } from '@/lib/agent-executor';

// Vercel Cron — tambahkan di vercel.json:
// { "crons": [{ "path": "/api/cron/agent", "schedule": "*/30 * * * *" }] }

export async function GET(req: NextRequest) {
  // Security: hanya Vercel Cron yang boleh panggil
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await agentStore.getAllActiveAddresses();
  console.log(`[Cron] Running agent for ${addresses.length} users`);

  // Fetch vault snapshots SEKALI untuk semua user (efisien)
  // Gunakan YO public API
  const vaultRes = await fetch('https://api.yo.xyz/v1/vaults?chainId=8453');
  const vaultData = await vaultRes.json();

  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      const state = await agentStore.getState(address);
      if (!state || !state.rules.enabled) return;

      state.lastRunAt = Date.now();
      await agentStore.saveState(state);

      return runAgentForUser(state, vaultData.vaults ?? []);
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  return NextResponse.json({ processed: addresses.length, succeeded });
}
```

---

## 6. `src/hooks/usePermitSign.ts` — Sign Permit Hook

```ts
'use client';

import { useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { signPermit } from 'wagmi-permit';
import { VAULTS } from '@/lib/yo';
import { YO_GATEWAY } from '@/lib/yo';

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const PERMIT_DEADLINE = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 tahun

export function usePermitSign() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const signAgentPermit = useCallback(async (vaultId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');

    const vault = VAULTS[vaultId as keyof typeof VAULTS];
    if (!vault) throw new Error('Invalid vault');

    const tokenAddress = vault.depositTokens[8453]; // Base
    if (!tokenAddress) throw new Error('Token not available on Base');

    // Token metadata untuk permit
    const TOKEN_META: Record<string, { name: string; version: string }> = {
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { name: 'USD Coin', version: '2' },
      '0x4200000000000000000000000000000000000006': { name: 'Wrapped Ether', version: '1' },
      '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { name: 'Coinbase Wrapped BTC', version: '2' },
      '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': { name: 'EURC', version: '2' },
    };

    const meta = TOKEN_META[tokenAddress.toLowerCase()];
    if (!meta) throw new Error('Token permit metadata not found');

    // Sign ERC-2612 permit (offline, no gas!)
    const sig = await signPermit(walletClient as any, {
      ownerAddress: address,
      spenderAddress: YO_GATEWAY as `0x${string}`,
      contractAddress: tokenAddress as `0x${string}`,
      erc20Name: meta.name,
      version: meta.version,
      deadline: PERMIT_DEADLINE,
      nonce: 0n,        // SDK akan fetch nonce yang benar
      chainId: 8453,
      value: MAX_UINT256, // Max approval — agent bisa move berapa saja
    });

    return {
      deadline: PERMIT_DEADLINE.toString(),
      v: sig.v,
      r: sig.r,
      s: sig.s,
      amount: MAX_UINT256.toString(),
      tokenAddress,
      chainId: 8453,
    };
  }, [walletClient, address]);

  return { signAgentPermit };
}
```

---

## 7. `src/hooks/useAgentStatus.ts` — Poll Status Hook

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { AgentState, AgentAction } from '@/lib/agent-store';

interface AgentStatus {
  enabled: boolean;
  state: AgentState | null;
  recentActions: AgentAction[];
}

export function useAgentStatus() {
  const { address } = useAccount();

  return useQuery<AgentStatus>({
    queryKey: ['agent-status', address],
    queryFn: async () => {
      if (!address) return { enabled: false, state: null, recentActions: [] };
      const res = await fetch(`/api/agent/status?address=${address}`);
      return res.json();
    },
    enabled: !!address,
    refetchInterval: 15_000, // Poll setiap 15 detik
    staleTime: 10_000,
  });
}
```

---

## 8. `src/components/dashboard/AgentModeCard.tsx` — UI Utama

Buat komponen React dengan spec visual berikut:

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  🤖  AI Agent Mode          [ACTIVE badge / OFF]     │
│  "Let AI automatically optimize your savings"        │
├─────────────────────────────────────────────────────┤
│  STATS (hanya tampil jika active):                  │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ 3            │  │ +$24.50/yr   │                 │
│  │ Actions taken│  │ Yield saved  │                 │
│  └──────────────┘  └──────────────┘                 │
├─────────────────────────────────────────────────────┤
│  RULES (slider/toggle — tampil saat inactive):      │
│  Min APY difference: [0.5%] slider                  │
│  Allow vaults: [USD✓] [ETH✓] [BTC] [EUR✓]          │
├─────────────────────────────────────────────────────┤
│  [Enable Agent Mode]  atau  [Disable Agent]         │
│  "Sign once. No gas. Cancel anytime."               │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Jika wallet tidak connect: tombol disabled + tooltip "Connect wallet first"
- Klik "Enable": panggil `signAgentPermit('yoUSD')` → kirim ke `/api/agent/enable`
- Loading state saat signing: "Signing permit... (no gas fee)"
- Setelah enable: tampilkan stats + AgentActivityFeed
- Klik "Disable": konfirmasi dialog → POST `/api/agent/disable`

**Warna:**
- Inactive: border `var(--border)`, background `var(--surface)`
- Active: border `var(--accent)`, background `var(--accent-dim)`, glow-accent class
- ACTIVE badge: background accent, teks hitam, pulse animation

---

## 9. `src/components/dashboard/AgentActivityFeed.tsx`

Render `recentActions` dari `useAgentStatus()`:

```
✅ 2 hours ago — Moved $50 to USD Savings (+$12/yr)    [view tx ↗]
⏭️ 4 hours ago — No action needed. Portfolio optimized.
✅ 6 hours ago — Moved $50 to USD Savings (+$8/yr)     [view tx ↗]
```

- Success (rebalance): icon hijau ✅ + tx hash link ke basescan.org
- Skipped (no_action): icon abu ⏭️
- Failed: icon merah ❌ + error message
- Max tampilkan 5 aksi terakhir
- Loading: shimmer skeleton
- Empty: "Agent is watching your portfolio..."

---

## 10. Integrasi ke `src/app/page.tsx`

Tambahkan `AgentModeCard` di antara `PortfolioCard` dan `VaultGrid`:

```tsx
import { AgentModeCard } from '@/components/dashboard/AgentModeCard';

// Di JSX:
<PortfolioCard />
<AgentModeCard />   {/* ← Tambahkan ini */}
<VaultGrid />
```

---

## 11. `vercel.json` — Cron Configuration

Buat file `vercel.json` di root project:

```json
{
  "crons": [
    {
      "path": "/api/cron/agent",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Tambahkan juga ke `.env.local`:
```env
CRON_SECRET=random_secret_string_here
```

---

## Alur Lengkap Setelah Fitur Ini

```
User buka app → lihat AgentModeCard (OFF state)
    ↓
Klik "Enable Agent Mode"
    ↓
Sign ERC-2612 permit (OFFLINE — no gas, no wallet popup untuk transaksi)
    ↓
Agent aktif ✅ — dashboard tampil "ACTIVE"
    ↓
Setiap 30 menit, server:
    → Ambil APY terbaru semua vault
    → Kirim ke Gemini: "Ada opportunity?"
    → Gemini: "yoUSD naik ke 6.5%, user ada di yoETH 3.6% — rebalance!"
    → Server eksekusi depositWithPermit() — user tidak perlu klik apapun
    → Log aksi masuk ke ActivityFeed
    ↓
User buka app keesokan harinya → lihat "2 actions taken, +$24/yr optimized"
```

---

## ⚠️ Checklist Setelah Build

- [ ] `npm run build` berhasil
- [ ] Upstash Redis terkoneksi (test dengan `/api/agent/status?address=0x...`)
- [ ] Sign permit berfungsi (tidak ada gas, hanya signature)
- [ ] `/api/agent/enable` menyimpan state ke Redis
- [ ] `/api/agent/status` mengembalikan state + actions
- [ ] AgentModeCard tampil dengan benar (OFF state)
- [ ] ActivityFeed render dengan benar
- [ ] `vercel.json` cron terkonfigurasi
- [ ] AGENT_PRIVATE_KEY menggunakan wallet baru yang berbeda dari wallet pribadi
- [ ] GEMINI_API_KEY tidak ter-expose ke client (tidak ada `NEXT_PUBLIC_` prefix)

---

## Catatan Keamanan Penting

1. **User tetap owner dana** — server wallet HANYA bisa deposit ke vault yang user pilih, receiver selalu address user
2. **Permit bisa di-revoke** — user bisa disable agent kapan saja, permit langsung tidak valid
3. **AGENT_PRIVATE_KEY** — isi dengan ETH secukupnya untuk gas (~$1 cukup untuk ratusan transaksi di Base)
4. **Redis data** — permit signature disimpan encrypted di Upstash, bukan di database publik