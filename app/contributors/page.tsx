'use client';

import React, { useState, useCallback, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  useContributors,
  useTotalContributorCount,
  ContributorFilters,
} from '@/hooks/useContributors';
import type { Repository } from '@/lib/repository';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Navbar } from '@/components/layout/Header';
import LeftSidebar from '@/components/sidebar/LeftSidebar';
import { ContributorHeader } from './components/ContributorHeader';
import { ContributorTable } from './components/ContributorTable';
import { ContributorPagination } from './components/ContributorPagination';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

// Dynamically import heavy components with loading state
const RepositorySheet = dynamic(
  () => import('@/components/dashboard/RepositorySheet').then((mod) => mod.RepositorySheet),
  {
    ssr: false,
    loading: () => <div className="p-4 text-center">Loading repository details...</div>,
  }
);

export default function ContributorsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <ContributorsContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function ContributorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams?.get('page') || '1', 10);

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ecosystem filter state
  const [selectedEcosystems, setSelectedEcosystems] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  // Always exclude forks without toggle
  const excludeForks = true;

  // Get the total count of all contributors (unfiltered)
  const { data: totalData } = useTotalContributorCount();

  // Get filtered contributors based on ecosystem and search
  const selectedEcosystem =
    selectedEcosystems.length > 0 ? selectedEcosystems.join(',') : undefined;
  const filters: ContributorFilters = {
    ecosystem: selectedEcosystem,
    excludeForks,
    search: searchQuery.trim() || undefined,
  };

  // Get filtered count for the search/ecosystem
  const { data: filteredData } = useTotalContributorCount(
    selectedEcosystem,
    searchQuery.trim() || undefined
  );
  const filteredTotal = filteredData?.totalCount ?? 0;

  // Get paginated contributors data
  const { data, isLoading, error } = useContributors(currentPage, filters);
  const { contributors = [], pagination = { totalPages: 1, totalCount: 0 } } = data || {};
  const { totalPages = 1 } = pagination;

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1 && (selectedEcosystems.length > 0 || searchQuery.trim())) {
      startTransition(() => {
        router.push('/contributors?page=1', { scroll: false });
      });
    }
  }, [selectedEcosystems, router, currentPage, searchQuery]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page === currentPage || page < 1 || page > totalPages) return;

      startTransition(() => {
        // Preserve ecosystem filters when changing pages
        const newParams = new URLSearchParams();
        newParams.set('page', page.toString());
        if (selectedEcosystem) {
          newParams.set('ecosystem', selectedEcosystem);
        }

        router.push(`/contributors?${newParams.toString()}`, { scroll: false });
      });
    },
    [router, currentPage, totalPages, selectedEcosystem]
  );

  const handleRepoClick = useCallback((repo: Repository) => {
    setSelectedRepo(repo);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      // Clear selected repo after animation completes
      setTimeout(() => setSelectedRepo(null), 300);
    }
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // Handle ecosystem selection from sidebar
  const handleEcosystemChange = useCallback((ecosystems: string[]) => {
    setSelectedEcosystems(ecosystems);
  }, []);

  // Handle filter change from sidebar
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchQuery(value);
  }, []);

  // Handle search form submission
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Reset to page 1 if we're doing a search
      if (currentPage !== 1) {
        startTransition(() => {
          router.push('/contributors?page=1', { scroll: false });
        });
      }
    },
    [router, currentPage]
  );

  if (error) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-medium text-red-500">Error loading contributors</h3>
        <p className="mt-2">{error.message || 'Please try again later'}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-4 px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Header with contributor counts - filtered/total */}
        <Navbar
          totalCount={filteredTotal}
          totalContributorCount={totalData?.totalCount ?? 0}
          displayMode="contributors"
          onMobileMenuToggle={handleMobileMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
          ecosystem={selectedEcosystems.join(',')}
          category={filter}
          searchTerm={searchQuery}
        />

        {/* Left Sidebar for ecosystem filtering */}
        <LeftSidebar
          selectedEcosystems={selectedEcosystems}
          filter={filter}
          onEcosystemChange={handleEcosystemChange}
          onFilterChange={handleFilterChange}
          selectedLanguage=""
          onLanguageChange={() => {}}
          selectedLicense=""
          onLicenseChange={() => {}}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="main-content">
          <div className="content-area">
            <main>
              <ErrorBoundary>
                <ContributorHeader />

                {/* GitHub User Search */}
                <form onSubmit={handleSearchSubmit} className="mb-4">
                  <div className="flex max-w-md items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        placeholder="Search GitHub username..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pr-10 bg-gray-800/50 border-gray-700 focus-visible:ring-indigo-500 text-gray-200 placeholder:text-gray-400"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <MagnifyingGlassIcon className="h-5 w-5" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </ErrorBoundary>

              <section aria-label="Contributors list" className="rounded-lg border border-gray-800">
                <ErrorBoundary>
                  <ContributorTable
                    contributors={contributors}
                    currentPage={currentPage}
                    isLoading={isLoading}
                    isPending={isPending}
                    onRepoClick={handleRepoClick}
                  />

                  {totalPages > 1 && (
                    <ContributorPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      disabled={isPending}
                    />
                  )}
                </ErrorBoundary>
              </section>
            </main>
          </div>
        </div>

        {/* Only render when sheet is open for better performance */}
        {sheetOpen && (
          <ErrorBoundary>
            <RepositorySheet
              repository={selectedRepo}
              open={sheetOpen}
              onOpenChange={handleSheetClose}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
