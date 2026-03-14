'use client';

import { VaultCard } from './VaultCard';
import { VAULTS, type VaultId } from '@/lib/yo';

export function VaultGrid() {
  const vaultIds = Object.keys(VAULTS) as VaultId[];

  return (
    <section>
      <div className="flex items-center gap-2 mb-5 sm:mb-6">
        <span className="section-label">/ Stakers</span>
      </div>
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {vaultIds.map((id) => (
          <VaultCard key={id} vaultId={id} />
        ))}
      </div>
    </section>
  );
}
