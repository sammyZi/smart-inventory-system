// Enhanced error handling utilities for TypeScript

export interface ErrorWithMessage {
  message: string;
}

export interface ErrorWithCode extends ErrorWithMessage {
  code?: string;
  statusCode?: number;
}

// Type guard to check if error has message
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Convert unknown error to ErrorWithMessage
export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

// Get error message safely
export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

// Get error code safely
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as Record<string, unknown>).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

// Get status code safely
export function getStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as Record<string, unknown>).statusCode;
    return typeof statusCode === 'number' ? statusCode : undefined;
  }
  return undefined;
}

// Enhanced error logging
export function logError(error: unknown, context?: Record<string, any>) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const statusCode = getStatusCode(error);
  
  return {
    message,
    code,
    statusCode,
    context,
    stack: error instanceof Error ? error.stack : undefined
  };
}

// Safe error handling wrapper
export function handleError<T>(
  operation: () => T,
  fallback: T,
  onError?: (error: unknown) => void
): T {
  try {
    return operation();
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return fallback;
  }
}

// Async safe error handling wrapper
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: unknown) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (onError) {
      onError(error);
    }
    return fallback;
  }
}

// Create standardized error response
export function createErrorResponse(error: unknown, requestId?: string) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error) || 'INTERNAL_ERROR';
  const statusCode = getStatusCode(error) || 500;

  return {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown'
    },
    statusCode
  };
}