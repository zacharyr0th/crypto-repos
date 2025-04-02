/**
 * Blockchain Technology Categories
 *
 * This file defines the main navigation categories for the blockchain platform.
 * Each category represents a major domain in blockchain technology with its
 * associated subcategories and features.
 *
 */

import type { IconType } from 'react-icons';
import {
  FaCode,
  FaTools,
  FaDatabase,
  FaLayerGroup,
  FaBuilding,
  FaShieldAlt,
  FaChartLine,
  FaGraduationCap,
} from 'react-icons/fa';

export interface Category {
  readonly id: string;
  readonly label: string;
  readonly icon: IconType;
  readonly description: string;
}

export const MAIN_CATEGORIES: readonly Category[] = [
  {
    id: 'core',
    label: 'Core',
    icon: FaCode,
    description: `Core blockchain components:
• Layer 1 & 2 protocols
• Consensus mechanisms
• Network architecture`,
  },
  {
    id: 'infrastructure',
    label: 'Infra',
    icon: FaTools,
    description: `Infrastructure and tooling:
• Oracle Networks & Data Feeds
• Validator & Staking Systems
• Development Tools`,
  },
  {
    id: 'defi',
    label: 'DeFi',
    icon: FaDatabase,
    description: `Decentralized Finance protocols:
• DEX & Trading Systems
• Lending & Borrowing
• Yield & Derivatives
• Stablecoins
• Risk Management`,
  },
  {
    id: 'nfts',
    label: 'NFTs',
    icon: FaLayerGroup,
    description: `Digital assets and NFTs:
• Token Standards
• Dynamic NFTs & Gaming
• Metaverse Integration
• Real-World Asset Tokenization
• Marketplace Infrastructure`,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    icon: FaBuilding,
    description: `Enterprise blockchain solutions:
• Private Networks
• Supply Chain Systems
• Compliance Tools
• Legacy Integration`,
  },
  {
    id: 'security',
    label: 'Security',
    icon: FaShieldAlt,
    description: `Security and privacy:
• Smart Contract Security
• Privacy Solutions
• Audit Tools`,
  },
  {
    id: 'data',
    label: 'Data',
    icon: FaChartLine,
    description: `Data management and analytics:
• Decentralized Storage
• Indexing & Query Tools
• Real-time Monitoring
• Data Availability`,
  },
  {
    id: 'education',
    label: 'Education',
    icon: FaGraduationCap,
    description: `Developer resources:
• Learning Materials
• Documentation
• Community Resources`,
  },
] as const;

// Export specific category IDs for type-safety
export type CategoryId = (typeof MAIN_CATEGORIES)[number]['id'];

export default MAIN_CATEGORIES;
