import * as React from 'react';

/**
 * Hook for persistent dialog feedback
 */
export const usePersistentDialogHook = (isPersistent: boolean = false) => {
  const [showFeedback, setShowFeedback] = React.useState(false);
  const feedbackTimeoutRef = React.useRef<number | null>(null);

  const triggerFeedback = React.useCallback(() => {
    if (!isPersistent) return;

    setShowFeedback(true);

    // Clear existing timeout
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    // Reset feedback after animation completes
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setShowFeedback(false);
      feedbackTimeoutRef.current = null;
    }, 500); // Match shake animation duration
  }, [isPersistent]);

  const feedbackClasses = React.useMemo(() => {
    if (!showFeedback) return '';
    return 'animate-shake cursor-not-allowed';
  }, [showFeedback]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    showFeedback,
    triggerFeedback,
    feedbackClasses,
    isPersistent,
  };
};