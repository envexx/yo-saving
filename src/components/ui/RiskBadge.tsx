import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, ShieldAlert } from 'lucide-react';

type RiskLevel = 'low' | 'medium' | 'high';

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string; icon: React.ElementType }> = {
  low: {
    label: 'Low Risk',
    className: 'bg-accent/10 text-accent border-accent/20',
    icon: Shield,
  },
  medium: {
    label: 'Medium Risk',
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: AlertTriangle,
  },
  high: {
    label: 'High Risk',
    className: 'bg-danger/10 text-danger border-danger/20',
    icon: ShieldAlert,
  },
};

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const config = RISK_CONFIG[risk];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
