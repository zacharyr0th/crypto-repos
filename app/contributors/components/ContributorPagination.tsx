/*
 * ContributorPagination component
 * Handles the pagination for the contributors table
 * Optimized with memoization and component extraction
 */

'use client';

import React, { useMemo } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface ContributorPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const PageNumber = React.memo(function PageNumber({
  page,
  currentPage,
  onClick,
  disabled,
}: {
  page: number;
  currentPage: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <PaginationItem>
      <PaginationLink
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        href="#"
        isActive={currentPage === page}
        className={cn('cursor-pointer', disabled && 'opacity-50 pointer-events-none')}
      >
        {page}
      </PaginationLink>
    </PaginationItem>
  );
});

const PreviousButton = React.memo(
  ({
    currentPage,
    onPageChange,
    disabled,
  }: {
    currentPage: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
  }) => {
    if (currentPage <= 1) return null;

    return (
      <PaginationItem>
        <PaginationPrevious
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) onPageChange(currentPage - 1);
          }}
          className={cn('cursor-pointer', disabled && 'opacity-50 pointer-events-none')}
        />
      </PaginationItem>
    );
  }
);

const NextButton = React.memo(
  ({
    currentPage,
    totalPages,
    onPageChange,
    disabled,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
  }) => {
    if (currentPage >= totalPages) return null;

    return (
      <PaginationItem>
        <PaginationNext
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) onPageChange(currentPage + 1);
          }}
          className={cn('cursor-pointer', disabled && 'opacity-50 pointer-events-none')}
        />
      </PaginationItem>
    );
  }
);

PageNumber.displayName = 'PageNumber';
PreviousButton.displayName = 'PreviousButton';
NextButton.displayName = 'NextButton';

function ContributorPaginationBase({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: ContributorPaginationProps) {
  // Generate the array of page numbers to show
  const visiblePages = useMemo(() => {
    // Always include first and last page
    const pageNumbers = new Set<number>([1, totalPages]);

    // Add current page and 1 page before and after
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pageNumbers.add(i);
    }

    // Convert to sorted array
    return Array.from(pageNumbers).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  // Don't render pagination if there's only 1 page or no pages
  if (totalPages <= 1) return null;

  return (
    <div className="py-4 border-t border-gray-800">
      <Pagination>
        <PaginationContent>
          <PreviousButton
            currentPage={currentPage}
            onPageChange={onPageChange}
            disabled={disabled}
          />
          {visiblePages.map((page, index, array) => {
            const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;

            return (
              <React.Fragment key={page}>
                {showEllipsisBefore && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PageNumber
                  page={page}
                  currentPage={currentPage}
                  onClick={() => onPageChange(page)}
                  disabled={disabled}
                />
              </React.Fragment>
            );
          })}
          <NextButton
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={disabled}
          />
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export const ContributorPagination = React.memo(ContributorPaginationBase);
