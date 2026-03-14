// ABI minimal YO Gateway yang dibutuhkan untuk agent execution
export const YO_GATEWAY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'partnerId', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'depositWithPermit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'partnerId', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'quotePreviewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'assets', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'minAssetsOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsOut', type: 'uint256' },
      { name: 'instant', type: 'bool' },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
