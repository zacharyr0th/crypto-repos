/*
 * ContributorRow component
 * Displays a single contributor row in the contributors table
 * Optimized with component extraction and memoization
 */

'use client';

import React, { useCallback, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  TableCell,
  TableRow,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { Repository } from '@/lib/repository';
import { useContributorRepositories } from '@/hooks/useContributorRepositories';
import { ContributorRepoCarouselDrawer } from '@/components/dashboard/ContributorRepoCarouselDrawer';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

interface ContributorRowProps {
  contributor: {
    contributor_login: string;
    contributor_html_url: string;
    contributor_avatar_url: string | null;
    total_contributions: number;
    repository_count: number;
    ecosystems: string;
    repositories: Repository[];
    formattedContributions?: string;
    formattedRepoCount?: string;
    global_rank?: number;
  };
  index: number;
  currentPage: number;
  onRepoClick: (repo: Repository) => void;
}

const ContributorAvatar = React.memo(({ url, login }: { url: string | null; login: string }) => {
  if (!url) return null;

  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden">
      <Image
        src={url}
        alt={login}
        width={24}
        height={24}
        className="object-cover"
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQrJyEkKSM5Mjg5OTM2O0tLNztLRjk2RV45QUZIYWFlaGR5eXl+fn5BQUH/2wBDAQwNDQ4NDx4QEBBBLiUuQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUH/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        priority={false}
      />
    </div>
  );
});

const RepositoryCard = React.memo(
  ({ repo, onClick }: { repo: Repository; onClick: () => void }) => (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-gray-800 hover:border-indigo-500 cursor-pointer transition-colors"
    >
      <h3 className="font-semibold text-base mb-1 text-indigo-400">{repo.name}</h3>
      <div className="text-xs text-gray-500 mb-2">
        {repo.owner?.login && (
          <span className="flex items-center gap-1">
            <span>by</span>
            <a
              href={repo.owner.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-300"
              onClick={(e) => e.stopPropagation()}
            >
              {repo.owner.login}
            </a>
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{repo.description}</p>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>⭐ {repo.stargazers_count}</span>
        <span>🔀 {repo.forks_count}</span>
      </div>
    </div>
  )
);

export const ContributorRowSkeleton = React.memo(() => (
  <TableRow>
    <TableCell className="w-[60px]">
      <Skeleton className="h-4 w-8" />
    </TableCell>
    <TableCell className="w-[350px]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </TableCell>
    <TableCell className="w-[200px]">
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="w-[150px]">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell className="flex-1">
      <Skeleton className="h-4 w-40" />
    </TableCell>
  </TableRow>
));

ContributorAvatar.displayName = 'ContributorAvatar';
RepositoryCard.displayName = 'RepositoryCard';
ContributorRowSkeleton.displayName = 'ContributorRowSkeleton';

const ContributorInfo = React.memo(
  ({ contributor }: { contributor: ContributorRowProps['contributor'] }) => (
    <div className="flex items-center gap-2">
      <ContributorAvatar
        url={contributor.contributor_avatar_url}
        login={contributor.contributor_login}
      />
      <a
        href={contributor.contributor_html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-indigo-400 hover:text-indigo-300"
      >
        @{contributor.contributor_login}
      </a>
    </div>
  )
);

ContributorInfo.displayName = 'ContributorInfo';

export const ContributorRow = React.memo<ContributorRowProps>(
  ({ contributor, index, currentPage, onRepoClick }) => {
    // Use the global_rank if available, otherwise fall back to calculating position from page and index
    const position = contributor.global_rank || (currentPage - 1) * 50 + index + 1;
    const [isOpen, setIsOpen] = useState(false);

    const handleRepoClick = useCallback(
      (repo: Repository) => {
        onRepoClick(repo);
        setIsOpen(false); // Close drawer when a repo is selected
      },
      [onRepoClick]
    );

    const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open);
    }, []);

    return (
      <TableRow>
        <TableCell className="w-[60px]">{position}</TableCell>
        <TableCell className="w-[350px]">
          <ContributorInfo contributor={contributor} />
        </TableCell>
        <TableCell className="w-[200px]">
          {contributor.formattedContributions || contributor.total_contributions.toLocaleString()}
        </TableCell>
        <TableCell className="w-[150px]">
          <button
            className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            {contributor.formattedRepoCount || `${contributor.repository_count} repos`}
          </button>

          {/* Wrap the carousel drawer with an error boundary */}
          <ErrorBoundary>
            <ContributorRepoCarouselDrawer
              contributorLogin={contributor.contributor_login}
              open={isOpen}
              onOpenChange={handleOpenChange}
              onRepoClick={handleRepoClick}
            />
          </ErrorBoundary>
        </TableCell>
        <TableCell className="flex-1">{contributor.ecosystems}</TableCell>
      </TableRow>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.contributor.contributor_login === nextProps.contributor.contributor_login &&
      prevProps.contributor.total_contributions === nextProps.contributor.total_contributions &&
      prevProps.contributor.repository_count === nextProps.contributor.repository_count &&
      prevProps.currentPage === nextProps.currentPage &&
      prevProps.index === nextProps.index
    );
  }
);

ContributorRow.displayName = 'ContributorRow';
