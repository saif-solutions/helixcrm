import { AxiosError } from 'axios';

export type BackendErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_EXISTS'
  | 'ACCOUNT_LOCKED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CSRF_TOKEN'
  | 'CSRF_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'
  | string;

export interface BackendErrorResponse {
  code?: BackendErrorCode;
  message?: string;
  field?: string;
  errors?: Record<string, string[]>;
}

export interface AuthError {
  message: string;
  code?: BackendErrorCode;
  field?: string;
}

export interface MappedErrors {
  fieldErrors?: Record<string, string>;
  formError?: string;
}

const ERROR_MAP: Record<string, string> = {
  'INVALID_CREDENTIALS': 'Incorrect email or password',
  'EMAIL_EXISTS': 'Email already registered',
  'ACCOUNT_LOCKED': 'Account temporarily locked. Please try again later.',
  'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
  'INVALID_CSRF_TOKEN': 'Security token expired. Please try again.',
  'CSRF_EXPIRED': 'Security token expired. Please try again.',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
  'NETWORK_ERROR': 'Network issue. Please check your connection and try again.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
};

export const mapBackendErrorToAuthError = (
  error: unknown,
  field?: string
): AuthError => {
  if (!(error instanceof AxiosError)) {
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      field
    };
  }

  if (!error.response) {
    return {
      message: ERROR_MAP.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      field
    };
  }

  const responseData = error.response.data as BackendErrorResponse;
  const errorCode = responseData.code || 'UNKNOWN_ERROR';
  const backendMessage = responseData.message || error.message || 'An error occurred';

  const message = ERROR_MAP[errorCode] || backendMessage;

  return {
    message,
    code: errorCode,
    field: responseData.field || field
  };
};

export const mapBackendErrorToFormErrors = (
  error: unknown
): MappedErrors => {
  const result: MappedErrors = {};
  
  if (!(error instanceof AxiosError) || !error.response) {
    result.formError = 'An unexpected error occurred. Please try again.';
    return result;
  }

  const responseData = error.response.data as BackendErrorResponse;
  
  // Handle field-specific errors
  if (responseData.errors) {
    result.fieldErrors = {};
    Object.entries(responseData.errors).forEach(([field, messages]) => {
      if (messages && messages.length > 0) {
        result.fieldErrors![field] = messages[0];
      }
    });
  }
  
  // Handle general form error
  const authError = mapBackendErrorToAuthError(error);
  if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
    result.formError = authError.message;
  }
  
  return result;
};

export const getFieldErrorMessage = (
  error: unknown,
  fieldName: string
): string | undefined => {
  const formErrors = mapBackendErrorToFormErrors(error);
  return formErrors.fieldErrors?.[fieldName];
};