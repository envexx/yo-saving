import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';

const EMPTY_RESPONSE = { enabled: false, state: null, recentActions: [] };

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json(EMPTY_RESPONSE);

  try {
    const state = await agentStore.getState(address.toLowerCase());
    const actions = await agentStore.getActions(address.toLowerCase());

    return NextResponse.json({
      enabled: !!state,
      state: state ?? null,
      recentActions: actions.slice(0, 10),
    });
  } catch {
    // Redis not configured — return safe fallback
    return NextResponse.json(EMPTY_RESPONSE);
  }
}
