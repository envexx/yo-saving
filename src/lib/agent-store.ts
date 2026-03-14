import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token || !url.startsWith('https')) {
      throw new Error('Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

export interface PermitData {
  deadline: string;
  v: number;
  r: string;
  s: string;
  amount: string;
  tokenAddress: string;
  chainId: number;
}

export interface AgentRules {
  minApyDiffPercent: number;
  maxSlippageBps: number;
  preferredVaults: string[];
  enabled: boolean;
}

export interface AgentState {
  userAddress: string;
  permit: PermitData;
  rules: AgentRules;
  enabledAt: number;
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

const stateKey = (addr: string) => `agent:state:${addr.toLowerCase()}`;
const actionsKey = (addr: string) => `agent:actions:${addr.toLowerCase()}`;

export const agentStore = {
  async saveState(state: AgentState): Promise<void> {
    await getRedis().set(stateKey(state.userAddress), JSON.stringify(state));
  },

  async getState(address: string): Promise<AgentState | null> {
    const data = await getRedis().get<string>(stateKey(address));
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as unknown as AgentState;
  },

  async deleteState(address: string): Promise<void> {
    await getRedis().del(stateKey(address));
  },

  async saveAction(action: AgentAction): Promise<void> {
    const raw = await getRedis().get<string>(actionsKey(action.userAddress));
    const actions: AgentAction[] = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as AgentAction[])
      : [];
    actions.unshift(action);
    if (actions.length > 50) actions.splice(50);
    await getRedis().set(actionsKey(action.userAddress), JSON.stringify(actions));
  },

  async getActions(address: string): Promise<AgentAction[]> {
    const data = await getRedis().get<string>(actionsKey(address));
    if (!data) return [];
    return typeof data === 'string' ? JSON.parse(data) : data as unknown as AgentAction[];
  },

  async getAllActiveAddresses(): Promise<string[]> {
    const keys = await getRedis().keys('agent:state:*');
    return keys.map((k: string) => k.replace('agent:state:', ''));
  },
};
