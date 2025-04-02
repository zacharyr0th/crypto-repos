/*
 * types.ts
 * Type definitions for sidebar components with performance optimizations
 */

import React from 'react';

/**
 * Represents an ecosystem option in the sidebar
 */
export interface EcosystemOption {
  id: string;
  name: string;
  icon: React.ReactNode | string;
  description?: string;
  priority?: boolean; // For prioritized image loading
}

/**
 * Props for the main LeftSidebar component
 */
export interface LeftSidebarProps {
  selectedEcosystems: string[];
  filter: string;
  onEcosystemChange: (ecosystems: string[]) => void;
  onFilterChange: (filter: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedLicense: string;
  onLicenseChange: (license: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Props for the EcosystemSection component
 */
export interface EcosystemSectionProps {
  selectedEcosystems: string[];
  onEcosystemChange: (ecosystems: string[]) => void;
  onFilterChange: (filter: string) => void;
}

/**
 * Props for the CategorySection component
 */
export interface CategorySectionProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onFilterChange: (filter: string) => void;
}

/**
 * Props for the StandalonePageLinks component
 */
export interface StandalonePageLinksProps {
  currentPath: string;
}
