/*
 * ContributorTable component
 * Displays the table of contributors with headers and rows
 * Optimized with memoization and component extraction
 */

'use client';

import React, { useMemo } from 'react';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui';
import { ContributorRow, ContributorRowSkeleton } from './ContributorRow';
import type { Repository } from '@/lib/repository';
import type { Contributor } from '@/hooks/useContributors';

interface ContributorTableProps {
  contributors: Contributor[];
  currentPage: number;
  isLoading: boolean;
  isPending: boolean;
  onRepoClick: (repo: Repository) => void;
}

const TableHeaderContent = React.memo(() => (
  <TableHeader>
    <TableRow className="border-b border-gray-800">
      <TableHead className="w-[60px] text-gray-400">#</TableHead>
      <TableHead className="w-[350px] text-gray-400">Contributor</TableHead>
      <TableHead className="w-[200px] text-gray-400">Contributions</TableHead>
      <TableHead className="w-[150px] text-gray-400">Repo(s)</TableHead>
      <TableHead className="flex-1 text-gray-400">Ecosystem(s)</TableHead>
    </TableRow>
  </TableHeader>
));

const LoadingRows = React.memo(() => (
  <>
    {Array.from({ length: 10 }).map((_, index) => (
      <ContributorRowSkeleton key={index} />
    ))}
  </>
));

const ContributorRows = React.memo(
  ({
    contributors,
    currentPage,
    onRepoClick,
  }: {
    contributors: Contributor[];
    currentPage: number;
    onRepoClick: (repo: Repository) => void;
  }) => (
    <>
      {contributors.map((contributor: Contributor, index: number) => (
        <ContributorRow
          key={contributor.contributor_login}
          contributor={contributor}
          index={index}
          currentPage={currentPage}
          onRepoClick={onRepoClick}
        />
      ))}
    </>
  )
);

const LoadingState = React.memo(() => (
  <div className="w-full overflow-x-auto">
    <Table>
      <TableCaption />
      <TableHeaderContent />
      <TableBody className="divide-y divide-gray-800">
        <LoadingRows />
      </TableBody>
    </Table>
  </div>
));

TableHeaderContent.displayName = 'TableHeaderContent';
LoadingRows.displayName = 'LoadingRows';
ContributorRows.displayName = 'ContributorRows';
LoadingState.displayName = 'LoadingState';

export const ContributorTable = React.memo(function ContributorTable({
  contributors,
  currentPage,
  isLoading,
  isPending,
  onRepoClick,
}: ContributorTableProps) {
  const isLoadingState = useMemo(() => isLoading || isPending, [isLoading, isPending]);

  if (isLoadingState) {
    return <LoadingState />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableCaption />
        <TableHeaderContent />
        <TableBody className="divide-y divide-gray-800">
          <ContributorRows
            contributors={contributors}
            currentPage={currentPage}
            onRepoClick={onRepoClick}
          />
        </TableBody>
      </Table>
    </div>
  );
});
