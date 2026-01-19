import { AxiosError } from 'axios';

export type BackendErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'ACCOUNT_LOCKED'
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
  errors?: Record<string, string[]>;
}

export interface AuthError {
  message: string;
  code?: BackendErrorCode;
  field?: string;
}

export const mapBackendErrorToMessage = (
  error: unknown,
  field?: string
): AuthError => {
  // Handle non-Axios errors
  if (!(error instanceof AxiosError)) {
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      field
    };
  }

  // Handle network connectivity issues
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      field
    };
  }

  const responseData = error.response.data as BackendErrorResponse;
  const errorCode = responseData.code;
  const backendMessage = responseData.message || 'An error occurred';

  // Map specific error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    'INVALID_CREDENTIALS': 'Email or password is incorrect',
    'USER_NOT_FOUND': 'Account does not exist',
    'EMAIL_EXISTS': 'Email already registered',
    'ACCOUNT_LOCKED': 'Account temporarily locked. Please try again later.',
    'INVALID_CSRF_TOKEN': 'Session expired, please retry',
    'CSRF_EXPIRED': 'Session expired, please retry',
    'TOKEN_EXPIRED': 'Session expired, please login again',
    'VALIDATION_ERROR': 'Please check your input and try again'
  };

  const message = errorMap[errorCode || ''] || backendMessage;

  return {
    message,
    code: errorCode,
    field
  };
};

export const getFieldError = (
  error: unknown,
  fieldName: string
): string | undefined => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as BackendErrorResponse;
    
    // Check for field-specific errors in the response
    if (responseData?.errors?.[fieldName]) {
      return responseData.errors[fieldName][0];
    }
    
    // Map specific error codes to fields
    if (responseData?.code === 'EMAIL_EXISTS' && fieldName === 'email') {
      return 'Email already registered';
    }
    
    if (responseData?.code === 'INVALID_CREDENTIALS') {
      if (fieldName === 'email') return 'Email or password is incorrect';
      if (fieldName === 'password') return 'Email or password is incorrect';
    }
  }
  
  return undefined;
};