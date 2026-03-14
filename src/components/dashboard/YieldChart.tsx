'use client';

import { useState } from 'react';
import { useVaultHistory } from '@yo-protocol/react';
import { VAULTS, type VaultId } from '@/lib/yo';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface YieldChartProps {
  vaultId?: VaultId;
}

export function YieldChart({ vaultId = 'yoUSD' }: YieldChartProps) {
  const [selectedVault, setSelectedVault] = useState<VaultId>(vaultId);
  const { yieldHistory, isLoading } = useVaultHistory(selectedVault);

  const chartData = yieldHistory?.map((point) => ({
    date: new Date(point.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    apy: point.value,
    timestamp: point.timestamp,
  })) ?? [];

  const vaultIds = Object.keys(VAULTS) as VaultId[];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <span className="section-label">/ Yield History</span>
      </div>

      <div className="bg-surface-2 border border-white/[0.04] rounded-2xl overflow-hidden">
        {/* Vault tabs */}
        <div className="flex gap-1.5 px-4 sm:px-5 py-3 border-b border-white/[0.04] overflow-x-auto">
          {vaultIds.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedVault(id)}
              className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                selectedVault === id
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-dim hover:text-text-secondary'
              }`}
            >
              {VAULTS[id].icon} {VAULTS[id].asset}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-3 sm:p-5">
          {isLoading ? (
            <div className="h-[200px] sm:h-[260px] shimmer rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-[200px] sm:h-[260px] flex items-center justify-center text-text-dim text-xs">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555555', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555555', fontSize: 10 }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111111',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#888888', marginBottom: '2px', fontSize: '10px' }}
                  itemStyle={{ color: '#00E676' }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, 'APY']}
                />
                <Area
                  type="monotone"
                  dataKey="apy"
                  stroke="#00E676"
                  strokeWidth={1.5}
                  fill="url(#chartGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
