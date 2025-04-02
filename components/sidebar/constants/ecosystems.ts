/*
 * ecosystems.ts
 * Constants for blockchain ecosystems with optimized image loading
 */

import type { EcosystemOption } from '../types';

// Define priority ecosystems for better performance
const PRIORITY_ECOSYSTEMS = new Set(['bitcoin', 'ethereum', 'binance']);

/**
 * Available blockchain ecosystems
 */
export const ECOSYSTEMS: readonly EcosystemOption[] = [
  {
    id: 'aptos',
    name: 'Aptos',
    icon: '/icons/chains/aptos.webp',
    priority: false,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: '/icons/chains/arbitrum.webp',
    priority: false,
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    icon: '/icons/chains/avalanche.webp',
    priority: false,
  },
  {
    id: 'base',
    name: 'Base',
    icon: '/icons/chains/base.webp',
    priority: false,
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    icon: '/icons/chains/bitcoin.webp',
    priority: true,
  },
  {
    id: 'binance',
    name: 'BNB Chain',
    icon: '/icons/chains/binance.webp',
    priority: true,
  },
  {
    id: 'celo',
    name: 'Celo',
    icon: '/icons/chains/celo.svg',
    priority: false,
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: '/icons/chains/cosmos.webp',
    priority: false,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    icon: '/icons/chains/ethereum.webp',
    priority: true,
  },
  {
    id: 'fantom',
    name: 'Fantom',
    icon: '/icons/chains/fantom.webp',
    priority: false,
  },
  {
    id: 'kusama',
    name: 'Kusama',
    icon: '/icons/chains/kusama.webp',
    priority: false,
  },
  {
    id: 'near',
    name: 'NEAR',
    icon: '/icons/chains/near.webp',
    priority: false,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: '/icons/chains/optimism.webp',
    priority: false,
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    icon: '/icons/chains/polkadot.webp',
    priority: false,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    icon: '/icons/chains/polygon.webp',
    priority: false,
  },
  {
    id: 'scroll',
    name: 'Scroll',
    icon: '/icons/chains/scroll.webp',
    priority: false,
  },
  {
    id: 'solana',
    name: 'Solana',
    icon: '/icons/chains/solana.webp',
    priority: false,
  },

  {
    id: 'sui',
    name: 'Sui',
    icon: '/icons/chains/sui.webp',
    priority: false,
  },
  {
    id: 'ton',
    name: 'TON',
    icon: '/icons/chains/ton.webp',
    priority: false,
  },
  {
    id: 'zksync',
    name: 'zkSync',
    icon: '/icons/chains/zksync.webp',
    priority: false,
  },
].map((ecosystem) => ({
  ...ecosystem,
  priority: PRIORITY_ECOSYSTEMS.has(ecosystem.id),
}));

// Pre-computed sorted ecosystems for better performance
export const SORTED_ECOSYSTEMS = [...ECOSYSTEMS].sort(
  (a, b) => Number(b.priority) - Number(a.priority)
);
