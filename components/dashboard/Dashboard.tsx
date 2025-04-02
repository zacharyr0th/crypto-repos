'use client';

import React, { useState, useCallback } from 'react';
import { Navbar } from '@/components/layout/Header';
import { Search } from './Search';
import { RepositoryView } from './Grid';
import LeftSidebar from '@/components/sidebar/LeftSidebar';
import { keepPreviousData } from '@tanstack/react-query';
import { useRepositories, useTotalCount } from '@/hooks/useRepositories';
import { SearchFilters } from '@/lib/types';
import { Repository } from '@/lib/repository';
import { ErrorBoundaryWrapper } from '@/components/layout/ErrorBoundaryWrapper';

/**
 * Dashboard - Main component for displaying and managing repository data
 * Handles state management, data fetching, and rendering of child components
 */
export const Dashboard: React.FC = () => {
  // State for UI
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEcosystems, setSelectedEcosystems] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedLicense, setSelectedLicense] = useState('');
  const [gridLayout, setGridLayout] = useState<'single' | 'compact'>('compact');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  // Derive ecosystem string from the array
  const ecosystem = selectedEcosystems.length > 0 ? selectedEcosystems.join(',') : '';

  // Wrap the data fetch section in a local error boundary for more granular error handling
  const RepositoryData = () => {
    // Optimized queries using custom hooks with improved data transformations
    const { data: totalCountData } = useTotalCount();

    const {
      data: repositoriesData,
      isLoading,
      error,
      isFetching,
      isPlaceholderData,
    } = useRepositories({
      ecosystem,
      page,
      searchTerm,
      filters: searchFilters,
      options: {
        placeholderData: keepPreviousData,
        select: useCallback(
          (data: { repositories: Repository[]; totalPages: number; totalCount: number }) => ({
            ...data,
            repositories: data.repositories.map((repo: Repository) => ({
              ...repo,
              // Pre-compute derived data to avoid re-renders
              formattedStars: repo.stargazers_count?.toLocaleString() || '0',
              formattedForks: repo.forks_count?.toLocaleString() || '0',
            })),
          }),
          []
        ),
      },
    });

    // If there's an explicit error, let the error boundary handle it
    if (error) throw error;

    return (
      <>
        {/* Navigation */}
        <Navbar
          totalCount={repositoriesData?.totalCount ?? 0}
          totalRepoCount={totalCountData?.totalCount ?? 0}
          ecosystem={ecosystem}
          category={filter}
          language={selectedLanguage}
          license={selectedLicense}
          searchTerm={searchTerm}
        />

        {/* Main content */}
        <div className="main-content">
          <div className="content-area">
            {/* Main Content */}
            <main>
              <div>
                {/* Search and Filters */}
                <div className="mb-8">
                  <Search
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    gridLayout={gridLayout}
                    onToggleLayout={toggleGridLayout}
                    onFilterChange={handleFilterChange}
                    ecosystem={ecosystem}
                    category={filter}
                  />
                </div>

                {/* Repository Grid */}
                <div className="min-h-[400px] w-full mt-6 sm:mt-8">
                  <RepositoryView
                    repositories={repositoriesData?.repositories ?? []}
                    loading={isLoading || isFetching}
                    isSearching={searchTerm !== '' || Object.keys(searchFilters).length > 0}
                    page={page}
                    totalPages={repositoriesData?.totalPages ?? 1}
                    gridLayout={gridLayout}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  };

  // Reset page when filters change - now using the useCallback hook for better performance
  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  React.useEffect(() => {
    resetPage();
  }, [ecosystem, searchTerm, searchFilters, resetPage]);

  // Optimized search with debounce
  const handleSearchChange = useCallback((value: string) => {
    const timeoutId = setTimeout(() => setSearchTerm(value), 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filters: SearchFilters) => {
    setSearchFilters((prev) => ({ ...prev, ...filters }));
    // Update related state
    if (filters.language) {
      setSelectedLanguage(filters.language);
    }
    if (filters.license) {
      setSelectedLicense(filters.license);
    }
  }, []);

  // Toggle grid layout with useCallback for better performance
  const toggleGridLayout = useCallback(() => {
    setGridLayout((prev) => (prev === 'single' ? 'compact' : 'single'));
  }, []);

  // Close sidebar with useCallback
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="app-container">
      {/* Left Sidebar - Always visible on desktop, slides on mobile */}
      {/* Use standard error boundary for sidebar as it doesn't use queries directly */}
      <ErrorBoundaryWrapper>
        <LeftSidebar
          selectedEcosystems={selectedEcosystems}
          filter={filter}
          onEcosystemChange={setSelectedEcosystems}
          onFilterChange={setFilter}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          selectedLicense={selectedLicense}
          onLicenseChange={setSelectedLicense}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />
      </ErrorBoundaryWrapper>

      {/* Use query-specific error boundary for the data-fetching part */}
      <ErrorBoundaryWrapper useQueryBoundary={true}>
        <RepositoryData />
      </ErrorBoundaryWrapper>
    </div>
  );
};
