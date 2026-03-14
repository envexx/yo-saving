import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
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
  sharesRaw: string;
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
  reason: string;
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
  .map(v => `- ${v.id}: ${v.apy.toFixed(2)}% APY, TVL $${(v.tvlUsd / 1e6).toFixed(1)}M, Risk: ${v.risk}`)
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
