'use client';

import React, { ReactNode } from 'react';
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * QueryErrorBoundary - A specialized error boundary for TanStack Query
 * This component integrates with TanStack Query's error handling mechanisms
 * to properly reset queries when errors occur.
 */
export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <QueryErrorResetBoundary>
      <ErrorBoundary onReset={reset} fallback={fallback}>
        {children}
      </ErrorBoundary>
    </QueryErrorResetBoundary>
  );
}
