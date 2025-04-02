/*
 * RepositoryView.tsx
 * Contains components for displaying repositories in a grid layout with pagination
 * Includes both the grid and pagination controls
 */

import React, { memo } from 'react';
import type { Repository } from '../../lib/repository';
import { RepositoryCard, RepositoryCardSkeleton } from './RepositoryCard';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../components/ui/pagination';

// Repository Grid Component
interface RepositoryGridProps {
  repositories: Repository[];
  loading: boolean;
  isSearching: boolean;
  page: number;
  totalPages: number;
  gridLayout: 'single' | 'compact';
  onPageChange: (page: number) => void;
}

// Loading Grid Component
const LoadingGrid = ({ gridLayout }: { gridLayout: 'single' | 'compact' }) => {
  const count = gridLayout === 'compact' ? 9 : 3;
  return (
    <div
      className={`grid grid-cols-1 ${
        gridLayout === 'compact'
          ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
          : ''
      } gap-4 w-full`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <RepositoryCardSkeleton key={index} />
      ))}
    </div>
  );
};

// Main RepositoryView component
const RepositoryView = memo(
  ({ repositories, loading, page, totalPages, gridLayout, onPageChange }: RepositoryGridProps) => {
    // Early return for loading state
    if (loading) {
      return <LoadingGrid gridLayout={gridLayout} />;
    }

    // Early return for empty state
    if (!repositories || repositories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg">No repositories found</p>
        </div>
      );
    }

    return (
      <div className="w-full space-y-4">
        <div
          className={`grid grid-cols-1 ${
            gridLayout === 'compact'
              ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
              : ''
          } gap-4 w-full`}
        >
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} gridLayout={gridLayout} />
          ))}
          {/* Add placeholder cards to maintain grid layout */}
          {gridLayout === 'compact' &&
            repositories.length % 3 !== 0 &&
            Array(3 - (repositories.length % 3))
              .fill(null)
              .map((_, index) => <div key={`placeholder-${index}`} className="invisible" />)}
        </div>

        {totalPages > 1 && (
          <RepositoryPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }
);

// Pagination Component
const RepositoryPagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <Pagination className="mt-8">
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              className="cursor-pointer"
            />
          </PaginationItem>
        )}

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (pageNum) =>
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
          )
          .map((pageNum, i, array) => {
            if (i > 0 && pageNum - array[i - 1] > 1) {
              return (
                <React.Fragment key={`ellipsis-${pageNum}`}>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => onPageChange(pageNum)}
                      isActive={pageNum === currentPage}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            }
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={pageNum === currentPage}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              className="cursor-pointer"
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
};

RepositoryView.displayName = 'RepositoryView';
export { RepositoryView };
