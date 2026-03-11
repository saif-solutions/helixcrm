// src/hooks/useFormSubmission.ts

import { useState } from 'react';
import { getErrorMessage, getFormErrors } from '../lib/types/error.types';

interface UseFormSubmissionOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string, formErrors?: Record<string, string>) => void;
}

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (
    submitFn: () => Promise<unknown>,
    options?: UseFormSubmissionOptions
  ) => {
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const data = await submitFn();
      options?.onSuccess?.(data);
      return data;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      const formErrors = getFormErrors(err);

      setError(errorMessage);
      setFieldErrors(formErrors);
      options?.onError?.(errorMessage, formErrors);

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    fieldErrors,
    handleSubmit,
    reset: () => {
      setError(null);
      setFieldErrors({});
    },
  };
}
