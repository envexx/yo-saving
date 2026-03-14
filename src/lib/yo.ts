export const YO_GATEWAY = '0xF1EeE0957267b1A474323Ff9CfF7719E964969FA';

export const VAULTS = {
  yoUSD: {
    id: 'yoUSD',
    address: '0x0000000f2eb9f69274678c76222b35eec7588a65',
    name: 'YO USD',
    displayName: 'USD Savings',
    description: 'Optimized USDC yield across DeFi',
    asset: 'USDC',
    icon: '/usd-coin-usdc-logo.svg',
    coingeckoId: 'usd-coin',
    risk: 'low' as const,
    chains: [8453, 1, 42161],
    depositTokens: {
      8453: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    } as Record<number, string>,
    decimals: 6,
  },
  yoETH: {
    id: 'yoETH',
    address: '0x3a43aec53490cb9fa922847385d82fe25d0e9de7',
    name: 'YO ETH',
    displayName: 'ETH Savings',
    description: 'Best ETH yield, risk-adjusted',
    asset: 'WETH',
    icon: '⟠',
    coingeckoId: 'ethereum',
    risk: 'low' as const,
    chains: [8453, 1],
    depositTokens: {
      8453: '0x4200000000000000000000000000000000000006',
      1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    } as Record<number, string>,
    decimals: 18,
  },
  yoBTC: {
    id: 'yoBTC',
    address: '0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc',
    name: 'YO BTC',
    displayName: 'BTC Savings',
    description: 'Bitcoin yield via cbBTC',
    asset: 'cbBTC',
    icon: '₿',
    coingeckoId: 'bitcoin',
    risk: 'medium' as const,
    chains: [8453, 1],
    depositTokens: {
      8453: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
      1: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    } as Record<number, string>,
    decimals: 8,
  },
  yoEUR: {
    id: 'yoEUR',
    address: '0x50c749ae210d3977adc824ae11f3c7fd10c871e9',
    name: 'YO EUR',
    displayName: 'EUR Savings',
    description: 'Euro stablecoin yield',
    asset: 'EURC',
    icon: '€',
    coingeckoId: 'euro-coin',
    risk: 'low' as const,
    chains: [8453, 1],
    depositTokens: {
      8453: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
      1: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
    } as Record<number, string>,
    decimals: 6,
  },
} as const;

export type VaultId = keyof typeof VAULTS;
export type VaultConfig = (typeof VAULTS)[VaultId];
