// apps/api/src/shared/types/error.types.ts
export interface AppError {
  message: string;
  stack?: string;
  code?: string | number;
  response?: {
    status: number;
    data: unknown;
  };
}

export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  );
}
