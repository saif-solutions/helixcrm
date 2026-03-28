// apps/api/src/shared/types/error.types.ts

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  requestId?: string;
  timestamp?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

/**
 * Application error interface
 * Standardizes error structure across the application
 */
export interface AppError {
  /** Human-readable error message */
  message: string;
  /** Error stack trace (only in development) */
  stack?: string;
  /** Error code for programmatic handling */
  code?: string | number;
  /** Original error response if applicable */
  response?: {
    status: number;
    data: unknown;
  };
  /** Additional error metadata */
  metadata?: Record<string, unknown>;
  /** Cause of the error (for error chaining) */
  cause?: Error;
}

/**
 * API Error with status code
 */
export interface ApiError extends AppError {
  statusCode: number;
  status: number;
}

/**
 * Database error with Prisma-specific fields
 */
export interface DatabaseError extends AppError {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  );
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    isAppError(error) &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number'
  );
}

/**
 * Type guard for ValidationError array
 * Safely checks if an unknown value is an array of ValidationError objects
 */
export function isValidationErrors(
  errors: unknown,
): errors is ValidationError[] {
  if (!Array.isArray(errors)) {
    return false;
  }

  return errors.every((error): error is ValidationError => {
    // Check if error is an object
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    // Cast to Record to safely check properties
    const errorRecord = error as Record<string, unknown>;

    // Check required properties
    const hasField =
      'field' in errorRecord && typeof errorRecord.field === 'string';
    const hasMessage =
      'message' in errorRecord && typeof errorRecord.message === 'string';

    if (!hasField || !hasMessage) {
      return false;
    }

    // Optional properties can be anything
    return true;
  });
}

/**
 * Type guard for DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    isAppError(error) &&
    'code' in error &&
    typeof (error as DatabaseError).code === 'string'
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isAppError(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/**
 * Extract error stack safely from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  if (isAppError(error)) return error.stack;
  return undefined;
}

/**
 * Create a standardized AppError from unknown error
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      cause: error,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: 'Unknown error occurred',
    metadata: { originalError: error },
  };
}

/**
 * Create an API error response
 */
export function createApiErrorResponse(
  statusCode: number,
  error: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    statusCode,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}
