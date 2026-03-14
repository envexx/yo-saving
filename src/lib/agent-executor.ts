import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { YO_GATEWAY_ABI, ERC20_ABI } from './yo-abi';
import { VAULTS, YO_GATEWAY } from './yo';
import type { AgentState, AgentAction } from './agent-store';
import { agentStore } from './agent-store';
import { getAgentDecision, type VaultSnapshot, type UserPosition } from './gemini';

const CHAIN = base;
const RPC_URL = 'https://mainnet.base.org';

function getServerAccount() {
  if (!process.env.AGENT_PRIVATE_KEY) {
    throw new Error('AGENT_PRIVATE_KEY not configured');
  }
  return privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
}

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

function getWalletClient() {
  return createWalletClient({
    account: getServerAccount(),
    chain: CHAIN,
    transport: http(RPC_URL),
  });
}

export async function runAgentForUser(
  state: AgentState,
  vaultSnapshots: VaultSnapshot[]
): Promise<AgentAction> {
  const actionId = `${state.userAddress}-${Date.now()}`;
  const userAddr = state.userAddress as `0x${string}`;

  // 1. Fetch user positions from chain
  const userPositions: UserPosition[] = [];
  for (const vault of Object.values(VAULTS)) {
    if (!(vault.chains as readonly number[]).includes(8453)) continue;
    const tokenAddr = (vault.depositTokens as Record<number, string>)[8453] as `0x${string}`;
    if (!tokenAddr) continue;
    try {
      const balance = await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddr],
      });
      if (balance > 0n) {
        const snap = vaultSnapshots.find(v => v.id === vault.id);
        const balanceFormatted = parseFloat(formatUnits(balance, vault.decimals));
        userPositions.push({
          vaultId: vault.id,
          balanceUsd: balanceFormatted,
          sharesRaw: balance.toString(),
          apy: snap?.apy ?? 0,
          tokenAddress: tokenAddr,
          decimals: vault.decimals,
        });
      }
    } catch {
      /* vault not active for user */
    }
  }

  // 2. Ask Gemini for decision
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

  // 3. Execute rebalance
  try {
    const fromVaultConfig = VAULTS[decision.fromVault as keyof typeof VAULTS];
    const toVaultConfig = VAULTS[decision.toVault as keyof typeof VAULTS];

    if (!fromVaultConfig || !toVaultConfig) throw new Error('Invalid vault config');

    const tokenAddr = (fromVaultConfig.depositTokens as Record<number, string>)[8453] as `0x${string}`;
    const userBalance = await publicClient.readContract({
      address: tokenAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddr],
    });

    if (userBalance === 0n) throw new Error('No balance to rebalance');

    const minSharesOut = await publicClient.readContract({
      address: YO_GATEWAY as `0x${string}`,
      abi: YO_GATEWAY_ABI,
      functionName: 'quotePreviewDeposit',
      args: [toVaultConfig.address as `0x${string}`, userBalance],
    });
    const minSharesWithSlippage = (minSharesOut * 995n) / 1000n;

    const permit = state.permit;
    const wClient = getWalletClient();
    const txHash = await wClient.writeContract({
      address: YO_GATEWAY as `0x${string}`,
      abi: YO_GATEWAY_ABI,
      functionName: 'depositWithPermit',
      args: [
        toVaultConfig.address as `0x${string}`,
        userBalance,
        minSharesWithSlippage,
        userAddr,
        9999n,
        BigInt(permit.deadline),
        permit.v,
        permit.r as `0x${string}`,
        permit.s as `0x${string}`,
      ],
    });

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
