'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2, X, ArrowRightLeft, ShieldCheck, ArrowUpRight, Clock } from 'lucide-react';

export type Step = 'idle' | 'switching-chain' | 'approving' | 'depositing' | 'waiting' | 'success' | 'error';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'switching-chain', label: 'Switch Network', icon: ArrowRightLeft },
  { key: 'approving', label: 'Approve Token', icon: ShieldCheck },
  { key: 'depositing', label: 'Saving', icon: ArrowUpRight },
  { key: 'waiting', label: 'Confirming', icon: Clock },
];

function getStepIndex(step: Step): number {
  return STEPS.findIndex((s) => s.key === step);
}

interface StepIndicatorProps {
  currentStep: Step;
  className?: string;
}

export function StepIndicator({ currentStep, className }: StepIndicatorProps) {
  if (currentStep === 'idle') return null;

  const currentIndex = getStepIndex(currentStep);
  const isError = currentStep === 'error';
  const isSuccess = currentStep === 'success';

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = isSuccess || (!isError && currentIndex > index);
          const isFailed = isError && currentIndex === index;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-accent/20 text-accent',
                  isActive && !isError && 'bg-accent/20 text-accent animate-pulse-glow',
                  isFailed && 'bg-danger/20 text-danger',
                  !isActive && !isCompleted && !isFailed && 'bg-surface-2 text-text-dim'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isActive && !isError ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFailed ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs text-center leading-tight',
                  isActive || isCompleted ? 'text-text-primary' : 'text-text-dim'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isError ? 'bg-danger' : isSuccess ? 'bg-accent' : 'bg-accent'
          )}
          style={{
            width: isSuccess
              ? '100%'
              : `${((Math.max(0, currentIndex) + 0.5) / STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Status text */}
      {isSuccess && (
        <p className="text-center text-accent text-sm font-medium mt-3">
          Done! 🎉
        </p>
      )}
      {isError && (
        <p className="text-center text-danger text-sm font-medium mt-3">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
