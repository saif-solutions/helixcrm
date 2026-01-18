import * as React from 'react';
import { DialogEvent, normalizeDialogEvent } from './Dialog.types';

export interface UseDialogInteractionsProps {
  open: boolean;
  persistent: boolean;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
  closeOnInteractOutside: boolean;
  onClose: (event?: DialogEvent) => void;
  onInteractOutside?: (event: DialogEvent) => void;
  triggerPersistentFeedback: () => void;
}

export function useDialogInteractions({
  open,
  persistent,
  closeOnEscape,
  closeOnOverlayClick,
  closeOnInteractOutside,
  onClose,
  onInteractOutside,
  triggerPersistentFeedback,
}: UseDialogInteractionsProps) {
  
  // Handle escape key press
  React.useEffect(() => {
    if (!open || persistent) return;
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!closeOnEscape) {
          event.preventDefault();
          event.stopPropagation();
          onInteractOutside?.(event);
          return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        onClose(event);
      }
    };
    
    document.addEventListener('keydown', handleEscape, true);
    
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open, closeOnEscape, persistent, onClose, onInteractOutside]);

  // Handle outside clicks
  React.useEffect(() => {
    if (!open || !closeOnInteractOutside || persistent) return;
    
    const handleOutsideClick = (event: MouseEvent) => {
      const normalized = normalizeDialogEvent(event);
      if (normalized?.type === 'mouse') {
        onClose(event);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick, true);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [open, closeOnInteractOutside, persistent, onClose]);

  // Handle overlay click
  const handleOverlayClick = React.useCallback((event: React.MouseEvent) => {
    if (!closeOnOverlayClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    if (persistent) {
      triggerPersistentFeedback();
      onInteractOutside?.(event);
      return;
    }
    
    // Only close if clicking directly on overlay
    if (event.target === event.currentTarget) {
      onClose(event);
    }
  }, [closeOnOverlayClick, persistent, triggerPersistentFeedback, onClose, onInteractOutside]);

  return {
    handleOverlayClick,
  };
}