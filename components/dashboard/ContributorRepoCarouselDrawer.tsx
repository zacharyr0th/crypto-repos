'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeftIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { useContributorRepositories } from '@/hooks/useContributorRepositories';
import type { Repository } from '@/lib/repository';
import { RepositoryCard, RepositoryCardSkeleton } from './RepositoryCard';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

interface ContributorRepoCarouselDrawerProps {
  contributorLogin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRepoClick: (repo: Repository) => void;
}

export const ContributorRepoCarouselDrawer = React.memo(
  ({ contributorLogin, open, onOpenChange, onRepoClick }: ContributorRepoCarouselDrawerProps) => {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [maxScroll, setMaxScroll] = useState(0);

    // Create a separate component for repositories content that can throw errors
    const RepositoriesContent = React.memo(() => {
      // Fetch repositories only when the drawer is open
      const {
        data: repositories,
        isLoading,
        error,
      } = useContributorRepositories(open ? contributorLogin : undefined, {
        // Always exclude forks by not passing any override option
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: open,
      });

      // Throw error if present so error boundary can catch it
      if (error) throw error;

      if (isLoading) {
        return (
          <div className="flex gap-4 pb-2 overflow-x-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="w-[280px] flex-none">
                <RepositoryCardSkeleton />
              </div>
            ))}
          </div>
        );
      }

      if (!repositories?.length) {
        return (
          <div className="text-center py-8 text-gray-400">
            No non-forked repositories found for this contributor
          </div>
        );
      }

      return (
        <>
          <div ref={carouselRef} className="carousel-scroll">
            {repositories.map((repo) => (
              <div key={repo.id} className="w-[280px] flex-none">
                <button className="w-full text-left" onClick={() => handleRepoCardClick(repo)}>
                  <RepositoryCard repository={repo} gridLayout="compact" />
                </button>
              </div>
            ))}
          </div>

          {/* Navigation Buttons - Only show if we have enough content to scroll */}
          {maxScroll > 10 && (
            <>
              <button
                onClick={scrollLeft}
                disabled={scrollPosition <= 0}
                className="carousel-nav carousel-nav-left"
                aria-label="Scroll left"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={scrollRight}
                disabled={scrollPosition >= maxScroll}
                className="carousel-nav carousel-nav-right"
                aria-label="Scroll right"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </>
      );
    });

    RepositoriesContent.displayName = 'RepositoriesContent';

    // Update scroll measurements when drawer opens or repositories load
    useEffect(() => {
      if (open && carouselRef.current && carouselRef.current.children.length > 0) {
        const { scrollWidth, clientWidth } = carouselRef.current;
        setMaxScroll(scrollWidth - clientWidth);
      }
    }, [open, carouselRef]);

    // Handle scroll event to update position indicators
    const handleScroll = () => {
      if (carouselRef.current) {
        setScrollPosition(carouselRef.current.scrollLeft);
        setMaxScroll(carouselRef.current.scrollWidth - carouselRef.current.clientWidth);
      }
    };

    // Attach scroll event listener
    useEffect(() => {
      const carousel = carouselRef.current;
      if (carousel) {
        carousel.addEventListener('scroll', handleScroll);
        return () => carousel.removeEventListener('scroll', handleScroll);
      }
    }, [open]);

    // Navigation handlers
    const scrollLeft = () => {
      if (carouselRef.current) {
        carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
      }
    };

    const scrollRight = () => {
      if (carouselRef.current) {
        carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
      }
    };

    // Create click handler wrapper for repository cards
    const handleRepoCardClick = (repo: Repository) => {
      onRepoClick(repo);
    };

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-w-6xl mx-auto">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl">Repositories by @{contributorLogin}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Cross2Icon className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription>
              Non-forked repositories contributed to by this user
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 relative">
            <ErrorBoundary>
              <RepositoriesContent />
            </ErrorBoundary>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
);

ContributorRepoCarouselDrawer.displayName = 'ContributorRepoCarouselDrawer';
