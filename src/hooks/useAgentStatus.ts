'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { AgentState, AgentAction } from '@/lib/agent-store';

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
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
