'use client';

import { useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-primary">
      <div className="text-center glass-background p-8 rounded-lg theme-shadow">
        <FaExclamationTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Something went wrong</h2>
        <p className="text-secondary mb-6 max-w-md mx-auto">
          {error.message || 'An unexpected error occurred'}
          {error.digest && (
            <span className="block text-sm mt-2 text-tertiary">Error ID: {error.digest}</span>
          )}
        </p>
        <Button onClick={reset} variant="default" className="hover-effect active-effect focus-ring">
          Try again
        </Button>
      </div>
    </div>
  );
}
