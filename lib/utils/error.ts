interface ErrorResponse {
  message: string;
  status: number;
}

export function sanitizeError(error: any, defaultMessage = 'An error occurred'): ErrorResponse {
  // Default error response
  const response: ErrorResponse = {
    message: defaultMessage,
    status: 500,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.message = error.message || defaultMessage;
  }

  // Handle known error types
  if (error.code === '23505') {
    // Postgres unique violation
    response.message = 'Resource already exists';
    response.status = 409;
  } else if (error.code === '23503') {
    // Foreign key violation
    response.message = 'Related resource not found';
    response.status = 404;
  }

  return response;
}
