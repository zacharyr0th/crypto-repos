'use client';

/*
 * RepositorySheet.tsx
 * A sheet component that displays detailed repository information
 */

import React, { useState, useEffect } from 'react';
import {
  FaStar,
  FaCodeBranch,
  FaBalanceScale,
  FaHome,
  FaGithub,
  FaEye,
  FaCode,
  FaUsers,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import type { Repository } from '@/lib/repository';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRepositoryContributors, type Contributor } from '@/hooks/useRepositoryContributors';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Button } from '@/components/ui/button';

interface RepositorySheetProps {
  repository: Repository | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContributorSkeleton = () => (
  <div className="flex items-center gap-2 py-1.5">
    <Skeleton className="h-6 w-6 rounded-full" />
    <Skeleton className="h-4 w-[100px]" />
    <Skeleton className="h-4 w-[60px] ml-auto" />
  </div>
);

const ContributorAvatar = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden">
      {isLoading && <Skeleton className="absolute inset-0 w-full h-full rounded-full" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="24px"
        className={cn('object-cover', isLoading ? 'opacity-0' : 'opacity-100')}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

const RepositorySheet = ({ repository: repo, open, onOpenChange }: RepositorySheetProps) => {
  const [excludeForks, setExcludeForks] = useState(true);

  if (!repo) return null;

  // Create a separate component for the contributors section that can throw errors
  const ContributorsList = () => {
    const {
      data: contributors,
      isLoading: isLoadingContributors,
      error,
    } = useRepositoryContributors(open ? repo?.id : undefined, {
      enabled: open && !!repo?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      retryDelay: 1000,
      excludeForks,
    });

    // Throw error if present so error boundary can catch it
    if (error) throw error;

    return (
      <ScrollArea className="h-[180px] w-full rounded-md border">
        <div className="p-3">
          {isLoadingContributors ? (
            // Show 5 skeleton items while loading
            Array.from({ length: 5 }).map((_, index) => <ContributorSkeleton key={index} />)
          ) : contributors?.length ? (
            contributors.map((contributor: Contributor) => (
              <div key={contributor.contributor_login} className="flex items-center gap-2 py-1.5">
                <ContributorAvatar
                  src={contributor.contributor_avatar_url || ''}
                  alt={contributor.contributor_login}
                />
                <a
                  href={contributor.contributor_html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex-1"
                >
                  @{contributor.contributor_login}
                </a>
                <span className="text-xs text-gray-500">
                  {contributor.total_contributions.toLocaleString()} commits
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">No contributors found</div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-3 mt-12">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              <span className="opacity-60">{repo.owner.login}</span>
              <span className="mx-1">/</span>
              <span>{repo.name}</span>
            </SheetTitle>
          </div>
          <SheetDescription className="text-sm">
            {repo.description || 'No description available'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Stats Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <FaStar className="text-amber-500 w-3.5 h-3.5" />
                <span className="text-sm font-medium">Stars</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">
                {repo.stargazers_count?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <FaCodeBranch className="text-blue-500 w-3.5 h-3.5" />
                <span className="text-sm font-medium">Forks</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">
                {repo.forks_count?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <FaEye className="text-green-500 w-3.5 h-3.5" />
                <span className="text-sm font-medium">Watchers</span>
              </div>
              <p className="text-xl font-semibold tabular-nums">
                {repo.watchers_count?.toLocaleString() || '0'}
              </p>
            </div>
            {repo.open_issues_count !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">Issues</span>
                </div>
                <p className="text-xl font-semibold tabular-nums">
                  {repo.open_issues_count?.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Contributors Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FaUsers className="text-purple-500 w-3.5 h-3.5" />
                Contributors
              </h3>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={excludeForks}
                  onChange={() => setExcludeForks(!excludeForks)}
                  className="h-3 w-3 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Hide forks</span>
              </label>
            </div>
            <ErrorBoundary>
              <ContributorsList />
            </ErrorBoundary>
          </div>

          {/* Repository Info */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Repository Information</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Repository ID:</span>
                <span className="font-mono">{repo.id}</span>
              </div>
              {repo.fork && (
                <div className="flex items-center gap-2">
                  <FaCode className="w-3.5 h-3.5 text-gray-500" />
                  <span>This repository is a fork</span>
                </div>
              )}
              {repo.language && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Primary Language: {repo.language}</span>
                </div>
              )}
              {repo.license && (
                <div className="flex items-center gap-2">
                  <FaBalanceScale className="w-3.5 h-3.5 text-gray-500" />
                  <span>License: {repo.license.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Activity</h3>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-gray-500">Created: </span>
                {formatDistanceToNow(new Date(repo.created_at), { addSuffix: true })}
              </div>
              <div>
                <span className="text-gray-500">Last Updated: </span>
                {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
              </div>
              {repo.pushed_at && (
                <div>
                  <span className="text-gray-500">Last Push: </span>
                  {formatDistanceToNow(new Date(repo.pushed_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>

          {/* Topics Section */}
          {repo.topics && repo.topics.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Topics</h3>
              <div className="flex flex-wrap gap-1.5">
                {repo.topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    #{topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Classification */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Classification</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Ecosystem: </span>
                {repo.ecosystem_name || repo.ecosystem ? (
                  <Badge variant="secondary">{repo.ecosystem_name || repo.ecosystem}</Badge>
                ) : (
                  '-'
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Category: </span>
                {repo.category_name || repo.category ? (
                  <Badge variant="outline">{repo.category_name || repo.category}</Badge>
                ) : (
                  '-'
                )}
              </div>
              {repo.size_category && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Size: </span>
                  <Badge variant="default">{repo.size_category.replace('-', ' ')}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="grid gap-2">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-4 rounded-lg transition-colors text-sm"
            >
              <FaGithub className="w-4 h-4" />
              <span>View GitHub</span>
            </a>
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-4 rounded-lg transition-colors text-sm"
              >
                <FaHome className="w-4 h-4" />
                <span>View Website</span>
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { RepositorySheet };
