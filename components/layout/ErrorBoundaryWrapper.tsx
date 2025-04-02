'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { QueryErrorBoundary } from './QueryErrorBoundary';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  useQueryBoundary?: boolean;
}

/**
 * ErrorBoundaryWrapper - Centralized error boundary wrapper component
 *
 * This component simplifies the usage of error boundaries throughout the application.
 * It can optionally use a specialized TanStack Query error boundary when dealing with
 * components that use queries.
 *
 * @param {React.ReactNode} children - The components to wrap with the error boundary
 * @param {boolean} useQueryBoundary - Whether to use the TanStack Query specialized boundary
 */
export function ErrorBoundaryWrapper({
  children,
  useQueryBoundary = false,
}: ErrorBoundaryWrapperProps) {
  // Use the specialized QueryErrorBoundary if specified
  if (useQueryBoundary) {
    return <QueryErrorBoundary>{children}</QueryErrorBoundary>;
  }

  // Otherwise use the standard ErrorBoundary
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
