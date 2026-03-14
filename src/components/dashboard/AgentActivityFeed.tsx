'use client';

import type { AgentAction } from '@/lib/agent-store';
import { ExternalLink, Check, SkipForward, AlertCircle } from 'lucide-react';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AgentActivityFeedProps {
  actions: AgentAction[];
  isLoading?: boolean;
}

export function AgentActivityFeed({ actions, isLoading }: AgentActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-text-dim">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs">Agent is watching your portfolio...</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {actions.slice(0, 5).map((action) => (
        <div
          key={action.id}
          className="flex items-start gap-2.5 py-2 px-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
        >
          {/* Status icon */}
          <div className="mt-0.5 shrink-0">
            {action.status === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-accent" />
              </div>
            ) : action.status === 'skipped' ? (
              <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">
                <SkipForward className="w-3 h-3 text-text-dim" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-3 h-3 text-red-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {action.geminiReason}
              {action.estimatedExtraYearlyUsd && action.estimatedExtraYearlyUsd > 0 && (
                <span className="text-accent ml-1">
                  (+${action.estimatedExtraYearlyUsd.toFixed(0)}/yr)
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-dim">{timeAgo(action.timestamp)}</span>
              {action.txHash && (
                <a
                  href={`https://basescan.org/tx/${action.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] text-accent hover:text-accent-hover transition-colors"
                >
                  view tx <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {action.error && (
                <span className="text-[10px] text-red-400 truncate">{action.error}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
