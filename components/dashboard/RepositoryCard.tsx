/*
 * RepositoryCard.tsx
 * Reusable component for displaying individual repository information in a card format
 * Enhanced for better responsive behavior across all screen sizes
 */

import React, { memo, useState } from 'react';
import { FaStar, FaCodeBranch, FaGithub } from 'react-icons/fa';
import type { Repository } from '../../lib/repository';
import { RepositorySheet } from './RepositorySheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface RepositoryCardProps {
  repository: Repository & {
    formattedStars?: string;
    formattedForks?: string;
  };
  gridLayout: 'single' | 'compact';
}

// Format last activity date to relative time
const formatLastActivity = (date: string | undefined): string => {
  if (!date) return 'No Activity';

  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Updated Today';
  if (days === 1) return 'Updated Yesterday';
  if (days < 7) return `Updated ${days} Days Ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} Weeks Ago`;
  if (days < 365) return `Updated ${Math.floor(days / 30)} Months Ago`;
  return `Updated ${Math.floor(days / 365)} Years Ago`;
};

// Add language abbreviation helper
const getLanguageAbbreviation = (language: string): string => {
  // Languages to keep full form
  const keepFull = ['Rust', 'Python', 'Go', 'Move', 'PHP', 'Java'];
  if (keepFull.includes(language)) return language;

  const abbreviations: { [key: string]: string } = {
    TypeScript: 'TS',
    JavaScript: 'JS',
    Ruby: 'Rb',
    'C++': 'C++',
    'C#': 'C#',
    Swift: 'Swift',
    Kotlin: 'Kotlin',
    Scala: 'Scala',
    Shell: 'Shell',
    Assembly: 'Asm',
    'Objective-C': 'Obj-C',
    Dart: 'Dart',
  };
  return abbreviations[language] || language;
};

// Component separated into smaller, more focused parts
const RepoHeader = ({ repo }: { repo: Repository; gridLayout: 'single' | 'compact' }) => (
  <div className="flex flex-col gap-1">
    <span className="truncate font-medium text-base">{repo.name}</span>
    <span className="truncate text-sm opacity-60">{repo.owner.login}</span>
    <span className="text-xs text-muted-foreground">{formatLastActivity(repo.updated_at)}</span>
  </div>
);

// Optimized RepoStats component using pre-computed values
const RepoStats = ({
  repo,
}: {
  repo: Repository & { formattedStars?: string; formattedForks?: string };
}) => (
  <div className="flex gap-x-4">
    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
      <FaStar className="text-amber-500 w-3.5 h-3.5" />
      <span className="text-sm tabular-nums">
        {repo.formattedStars || repo.stargazers_count?.toLocaleString() || '0'}
      </span>
    </div>
    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
      <FaCodeBranch className="text-blue-500 w-3.5 h-3.5" />
      <span className="text-sm tabular-nums">
        {repo.formattedForks || repo.forks_count?.toLocaleString() || '0'}
      </span>
    </div>
    {repo.language && (
      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm cursor-default">
                {getLanguageAbbreviation(repo.language)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{repo.language}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )}
  </div>
);

// Optimized RepoTags component with better null handling
const RepoTags = ({ repo }: { repo: Repository }) => {
  if (!repo.ecosystem && !repo.category) return null;

  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-1.5">
        {repo.ecosystem && (
          <Badge variant="secondary" className="truncate max-w-[120px]">
            {repo.ecosystem}
          </Badge>
        )}
        {repo.category && (
          <Badge variant="outline" className="truncate max-w-[120px]">
            {repo.category}
          </Badge>
        )}
      </div>
      <a
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <FaGithub className="w-4 h-4 opacity-60 hover:opacity-100 transition-opacity" />
      </a>
    </div>
  );
};

// Responsive card styling
const cardBaseClasses =
  'block bg-gradient-to-br from-gray-100/90 to-gray-50/50 dark:from-gray-800/30 dark:to-gray-700/20 shadow-lg dark:shadow-none hover:shadow-xl transition-all duration-300 rounded-xl md:rounded-2xl p-4 border border-gray-200/50 dark:border-gray-600/20 h-[160px] w-full text-left';

// Optimized RepositoryCard with better performance
const RepositoryCard = memo(
  ({ repository: repo, gridLayout }: RepositoryCardProps) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Early return for null data
    if (!repo) return <RepositoryCardSkeleton />;

    return (
      <>
        <button onClick={() => setIsSheetOpen(true)} className={cardBaseClasses}>
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <RepoHeader repo={repo} gridLayout={gridLayout} />
              <RepoStats repo={repo} />
            </div>
            <RepoTags repo={repo} />
          </div>
        </button>

        {isSheetOpen && (
          <RepositorySheet repository={repo} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.repository.id === nextProps.repository.id &&
      prevProps.repository.updated_at === nextProps.repository.updated_at &&
      prevProps.gridLayout === nextProps.gridLayout
    );
  }
);

RepositoryCard.displayName = 'RepositoryCard';

// Add RepositoryCardSkeleton component
export const RepositoryCardSkeleton = () => (
  <div className={cardBaseClasses}>
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-2">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>

        {/* Stats Skeleton */}
        <div className="flex gap-x-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>

      {/* Tags Skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  </div>
);

export { RepositoryCard };
