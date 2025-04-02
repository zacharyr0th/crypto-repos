'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import of Dashboard component with client-side only rendering
const Dashboard = dynamic(
  () => import('@/components/dashboard/Dashboard').then((mod) => mod.Dashboard),
  { ssr: false }
);

const DashboardSkeleton = () => (
  <div className="w-full space-y-8">
    {/* Header skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
    </div>

    {/* Grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[40px]" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function DashboardWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
