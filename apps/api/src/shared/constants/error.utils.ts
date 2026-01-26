import { 
  ErrorCode, 
  ErrorCategory, 
  ErrorSeverity,
  ErrorCodeCategory,
  ErrorCodeHttpStatus 
} from './error-codes.enum';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  statusCode: number;
  severity: ErrorSeverity;
  details?: Record<string, any>;
  hint?: string;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>,
    public hint?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  toResponse(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      category: ErrorCodeCategory[this.code],
      statusCode: ErrorCodeHttpStatus[this.code],
      severity: this.getSeverity(),
      details: this.details,
      hint: this.hint,
      timestamp: new Date().toISOString(),
    };
  }

  private getSeverity(): ErrorSeverity {
    const status = ErrorCodeHttpStatus[this.code];
    
    if (status >= 500) {
      return ErrorSeverity.HIGH;
    } else if (status === 429 || status === 423) {
      return ErrorSeverity.MEDIUM;
    } else if (status >= 400) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.LOW;
  }

  static fromError(error: unknown, defaultCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(defaultCode, error.message);
    }

    return new AppError(defaultCode, 'An unknown error occurred');
  }
}

/**
 * Helper to create common errors
 */
export const Errors = {
  // Auth errors
  invalidCredentials: (hint?: string) => 
    new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', undefined, hint),
  
  invalidToken: (hint?: string) =>
    new AppError(ErrorCode.AUTH_INVALID_TOKEN, 'Invalid authentication token', undefined, hint),
  
  expiredToken: (hint?: string) =>
    new AppError(ErrorCode.AUTH_EXPIRED_TOKEN, 'Authentication token has expired', undefined, hint),
  
  accountLocked: (lockedUntil?: Date) =>
    new AppError(
      ErrorCode.AUTH_ACCOUNT_LOCKED, 
      'Account is temporarily locked due to too many failed login attempts',
      lockedUntil ? { lockedUntil } : undefined,
      'Please try again later or contact support'
    ),
  
  // Permission errors
  permissionDenied: (resource?: string, action?: string) =>
    new AppError(
      ErrorCode.PERMISSION_DENIED,
      'You do not have permission to perform this action',
      resource && action ? { resource, action } : undefined,
      'Contact your administrator for access'
    ),
  
  // Validation errors
  validationFailed: (errors: Record<string, string[]>) =>
    new AppError(
      ErrorCode.VALIDATION_FAILED,
      'Validation failed',
      { errors },
      'Please check your input and try again'
    ),
  
  resourceNotFound: (resource: string, id?: string) =>
    new AppError(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found`,
      id ? { resource, id } : { resource },
      'Check the resource ID and try again'
    ),
  
  // Tenant errors
  tenantMismatch: (expected: string, actual: string) =>
    new AppError(
      ErrorCode.TENANT_MISMATCH,
      'Tenant context mismatch',
      { expectedTenantId: expected, actualTenantId: actual },
      'Ensure you are accessing the correct tenant data'
    ),
  
  // Rate limiting
  rateLimited: (retryAfter?: number) =>
    new AppError(
      ErrorCode.RATE_LIMITED,
      'Rate limit exceeded',
      retryAfter ? { retryAfter } : undefined,
      'Please wait before making more requests'
    ),
  
  // System errors
  internalError: (error?: Error) =>
    new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred',
      error ? { originalError: error.message } : undefined,
      'Please try again later or contact support'
    ),
};
