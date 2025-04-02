'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';

// Common styles using Tailwind classes - moved to a constant object
const STYLES = {
  wrapper:
    'fixed top-0 left-0 right-0 z-[60] h-[var(--header-height)] bg-white/90 dark:bg-[#0A0A0B]/90 border-b border-gray-200/30 dark:border-gray-800/30 backdrop-blur-md transition-colors duration-200',
  container:
    'flex h-full w-full max-w-[var(--content-max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-6)]',
  title:
    'flex items-center font-mono text-lg sm:text-xl lg:text-2xl whitespace-nowrap text-gray-900 dark:text-gray-50 transition-colors duration-200',
  controls: 'flex-1 flex justify-end',
  controlsInner: 'flex items-center',
  countWrapper: 'flex flex-col items-end text-gray-400 dark:text-gray-500',
  countText: 'flex items-center gap-2',
  filteredCount: 'font-mono text-sm font-medium text-indigo-500 dark:text-indigo-400',
  totalCount: 'font-mono text-sm font-medium text-gray-700 dark:text-gray-300',
  filterState: 'hidden sm:block text-[10px] uppercase tracking-wider mt-0.5',
  menuButton:
    'lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 -ml-2',
  divider: 'hidden sm:block text-sm font-light',
  denominator: 'hidden sm:block',
} as const;

// Types moved to one place for better maintainability
interface FilterProps {
  ecosystem?: string;
  category?: string;
  language?: string;
  license?: string;
  searchTerm?: string;
}

interface CountProps extends FilterProps {
  totalCount?: number;
  totalRepoCount?: number;
  totalContributorCount?: number;
  displayMode?: 'repos' | 'contributors';
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

// Helper function to format filter state
const formatFilterState = (props: FilterProps): string => {
  const { ecosystem, category, language, license, searchTerm } = props;
  const parts: string[] = [];

  if (ecosystem) {
    const ecosystems = ecosystem.split(',').filter(Boolean);
    if (ecosystems.length > 0) {
      parts.push(ecosystems.join('/'));
    }
  }

  if (category && category !== ecosystem) {
    parts.push(category);
  }

  if (language?.trim()) {
    parts.push(language);
  }

  if (license?.trim()) {
    parts.push(license);
  }

  if (searchTerm?.trim()) {
    const formattedSearch = searchTerm
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    parts.push(formattedSearch);
  }

  return parts.length > 0 ? parts.join('-') : 'All';
};

const RepoCount = memo(
  ({
    totalCount,
    totalRepoCount,
    totalContributorCount,
    displayMode = 'repos',
    ...filterProps
  }: CountProps) => {
    const formattedTotalCount = useMemo(() => {
      if (displayMode === 'repos') {
        return (
          typeof totalCount === 'number' ? totalCount : (totalRepoCount ?? 0)
        ).toLocaleString();
      } else {
        return (typeof totalCount === 'number' ? totalCount : 0).toLocaleString();
      }
    }, [totalCount, totalRepoCount, displayMode]);

    const formattedTotalRepoCount = useMemo(() => {
      if (displayMode === 'repos') {
        return (totalRepoCount ?? 0).toLocaleString();
      } else {
        return (totalContributorCount ?? 0).toLocaleString();
      }
    }, [totalRepoCount, totalContributorCount, displayMode]);

    const isFiltered = useMemo(() => {
      if (displayMode === 'repos') {
        return typeof totalCount === 'number' && totalCount !== totalRepoCount;
      } else {
        // For contributors view, show filtered/total when ecosystem is selected OR when searching
        return (
          (filterProps.ecosystem &&
            filterProps.ecosystem !== 'all' &&
            filterProps.ecosystem.trim() !== '') ||
          (filterProps.searchTerm && filterProps.searchTerm.trim() !== '')
        );
      }
    }, [totalCount, totalRepoCount, displayMode, filterProps.ecosystem, filterProps.searchTerm]);

    const filterState = useMemo(() => formatFilterState(filterProps), [filterProps]);

    return (
      <div
        className={STYLES.countWrapper}
        data-tooltip-id="repo-count-info"
        data-tooltip-content={
          isFiltered
            ? displayMode === 'repos'
              ? 'Filtered repositories / Total repositories'
              : 'Filtered contributors / Total contributors'
            : displayMode === 'repos'
              ? 'Total repositories'
              : 'Total contributors'
        }
      >
        <div className={STYLES.countText}>
          <span className={isFiltered ? STYLES.filteredCount : STYLES.totalCount}>
            {formattedTotalCount}
          </span>
          {isFiltered && <span className={STYLES.divider}>/</span>}
          {isFiltered && (
            <span className={STYLES.denominator}>
              <span className={STYLES.totalCount}>{formattedTotalRepoCount}</span>
            </span>
          )}
        </div>
        <span className={STYLES.filterState}>{filterState}</span>
      </div>
    );
  }
);

RepoCount.displayName = 'RepoCount';

// Simplified StatsDisplay since it's just wrapping RepoCount
const StatsDisplay = memo((props: CountProps) => (
  <div className="flex items-center">
    <RepoCount {...props} />
  </div>
));

StatsDisplay.displayName = 'StatsDisplay';

const MenuButton = memo(({ onClick, isOpen }: { onClick?: () => void; isOpen?: boolean }) => (
  <button
    onClick={onClick}
    className={STYLES.menuButton}
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
  >
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
      />
    </svg>
  </button>
));

MenuButton.displayName = 'MenuButton';

// Removed redundant interface and used existing CountProps
export const Navbar = memo((props: CountProps) => {
  const { onMobileMenuToggle, isMobileMenuOpen } = props;

  return (
    <header className={STYLES.wrapper}>
      <div className={STYLES.container}>
        <div className="flex items-center gap-4">
          <MenuButton onClick={onMobileMenuToggle} isOpen={isMobileMenuOpen} />
          <Link href="/" className={STYLES.title}>
            Crypto-Repos
          </Link>
        </div>

        <div className={STYLES.controls}>
          <div className={STYLES.controlsInner}>
            <StatsDisplay {...props} />
          </div>
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
