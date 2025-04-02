'use client';

/*
 * LeftSidebar.tsx
 * Main navigation sidebar with ecosystem selection, filters, and social footer
 */

import React, { memo } from 'react';
import { FaTimes } from 'react-icons/fa';
import type { LeftSidebarProps } from './types';
import { EcosystemSection, CategorySection, SocialFooter, StandalonePages } from './components';

/**
 * Left sidebar component for ecosystem and filter selection
 * Provides navigation between different blockchain ecosystems and filter options
 *
 * Features:
 * - Multiple ecosystem selection (Ethereum, Bitcoin, etc.)
 * - Category filtering
 * - Links to standalone pages (Contributors, Verified, Popular)
 * - Social media links and repository stats
 * - Responsive design (desktop/mobile)
 *
 * @param {string[]} selectedEcosystems - Currently selected ecosystems
 * @param {string} filter - Currently active filter
 * @param {Function} onEcosystemChange - Callback when ecosystem selection changes
 * @param {Function} onFilterChange - Callback when filter selection changes
 * @param {boolean} [isOpen] - Whether the sidebar is open (mobile only)
 * @param {Function} [onClose] - Callback to close the sidebar (mobile only)
 * @returns {JSX.Element} Rendered component
 */
const LeftSidebar = memo(
  ({
    selectedEcosystems = [],
    filter = '',
    onEcosystemChange,
    onFilterChange,
    isOpen = false,
    onClose = () => {},
  }: LeftSidebarProps) => {
    return (
      <>
        <aside className={`left-sidebar ${isOpen ? 'open' : ''}`}>
          <div className="flex flex-col h-full">
            {/* Mobile close button */}
            <div className="flex-shrink-0 flex justify-end p-4 lg:hidden">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <nav className="pt-6 space-y-6">
                <EcosystemSection
                  selectedEcosystems={selectedEcosystems}
                  onEcosystemChange={onEcosystemChange}
                  onFilterChange={onFilterChange}
                />
                <CategorySection
                  selectedCategory={filter}
                  onCategoryChange={onFilterChange}
                  onFilterChange={onFilterChange}
                />
              </nav>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0">
              <div className="border-t border-gray-200/10">
                <StandalonePages />
              </div>
              <div className="border-t border-gray-200/10">
                <SocialFooter />
              </div>
            </div>
          </div>
        </aside>
        {/* Overlay for mobile */}
        {isOpen && (
          <div
            className="sidebar-overlay sidebar-overlay-visible"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </>
    );
  }
);

LeftSidebar.displayName = 'LeftSidebar';

export default LeftSidebar;
