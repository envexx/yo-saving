import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/agent-store';

export async function POST(req: NextRequest) {
  try {
    const { userAddress } = await req.json();
    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }
    await agentStore.deleteState(userAddress.toLowerCase());
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to disable agent' }, { status: 500 });
  }
}
