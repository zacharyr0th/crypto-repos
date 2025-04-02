/**
 * Standardized error handling module for the application
 * Provides consistent error classes and utilities across components
 */

import { logger } from './logger';

export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class GitHubError extends BaseError {
  constructor(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message, 'GITHUB_ERROR', statusCode, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', statusCode, details);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, retryAfter?: number, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, {
      retryAfter,
      ...details,
    });
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export function handleError(error: unknown, context: string): never {
  if (error instanceof BaseError) {
    logger.error(`[${context}] ${error.message}`, {
      error: error.toJSON(),
      context,
    });
    throw error;
  }

  if (error instanceof Error) {
    const baseError = new BaseError(error.message, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
    });
    logger.error(`[${context}] ${error.message}`, {
      error: baseError.toJSON(),
      context,
    });
    throw baseError;
  }

  const baseError = new BaseError('An unknown error occurred', 'UNKNOWN_ERROR', 500, {
    originalError: String(error),
  });
  logger.error(`[${context}] An unknown error occurred`, {
    error: baseError.toJSON(),
    context,
  });
  throw baseError;
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
  }
}
