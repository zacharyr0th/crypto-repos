'use client';

// Error boundary component for graceful error handling across the application
// Properly implements React's error boundary lifecycle methods and integrates with TanStack Query

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ErrorFallback = ({ error, onReset }: { error?: Error | null; onReset: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-primary">
    <div className="glass-background p-8 rounded-lg theme-shadow">
      <FaExclamationTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2 text-primary">Something went wrong</h2>
      <p className="text-secondary mb-4 max-w-md">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <Button variant="default" onClick={onReset} className="hover-effect active-effect focus-ring">
        Try again
      </Button>
    </div>
  </div>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service here
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  resetErrorBoundary = (): void => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
    });

    // Call the onReset handler if provided (for TanStack Query reset)
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // You can render any custom fallback UI
      if (fallback) {
        return fallback;
      }

      return <ErrorFallback error={error} onReset={this.resetErrorBoundary} />;
    }

    return children;
  }
}
