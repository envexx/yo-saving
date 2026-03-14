import { NextRequest, NextResponse } from 'next/server';
import { agentStore, type AgentState } from '@/lib/agent-store';

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
    const message = err instanceof Error ? err.message : 'Failed to enable agent';
    console.error('[Agent Enable Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
