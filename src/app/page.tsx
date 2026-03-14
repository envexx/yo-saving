import { PortfolioCard } from '@/components/dashboard/PortfolioCard';
import { AgentModeCard } from '@/components/dashboard/AgentModeCard';
import { VaultGrid } from '@/components/dashboard/VaultGrid';
import { YieldChart } from '@/components/dashboard/YieldChart';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8">
        {/* Hero stat card */}
        <PortfolioCard />

        {/* AI Agent Mode */}
        <AgentModeCard />

        {/* Vault stakers grid */}
        <VaultGrid />

        {/* Bento: chart + history side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          <div className="lg:col-span-3">
            <YieldChart />
          </div>
          <div className="lg:col-span-2">
            <TransactionHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
