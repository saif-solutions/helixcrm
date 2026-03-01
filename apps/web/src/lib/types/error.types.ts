// src/lib/types/error.types.ts

/**
 * Standard API error response shape
 * Based on API_CONTRACTS.md error format
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
    timestamp: string;
  };
  status?: number;
}

/**
 * Network/Axios error structure
 */
export interface NetworkError {
  response?: {
    status: number;
    data: ApiErrorResponse;
  };
  request?: unknown;
  message: string;
  code?: string;
}

/**
 * Type guard to check if an error is an ApiError
 * Uses type-safe approach with no 'any' types
 */
export function isApiError(error: unknown): error is NetworkError {
  // Early return for non-objects
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const potentialError = error as Record<string, unknown>;
  
  // Check if it has response property
  if (!('response' in potentialError)) {
    return false;
  }

  const response = potentialError.response;
  
  // Check if response exists and is an object
  if (!response || typeof response !== 'object') {
    return false;
  }

  const responseObj = response as Record<string, unknown>;
  
  // Check if response has data property
  if (!('data' in responseObj)) {
    return false;
  }

  const data = responseObj.data;
  
  // Check if data exists and is an object with error property
  if (!data || typeof data !== 'object') {
    return false;
  }

  const dataObj = data as Record<string, unknown>;
  
  return 'error' in dataObj;
}

/**
 * Extract user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.error?.message || 'An unexpected error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract form errors from API error
 */
export function getFormErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (isApiError(error)) {
    const details = error.response?.data?.error?.details;
    if (details && Array.isArray(details)) {
      details.forEach(({ field, message }) => {
        errors[field] = message;
      });
    }
  }
  
  return errors;
}