// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\scrollLockManager.ts

/**
 * Enterprise-grade scroll lock manager with reference counting
 * Supports nested dialogs and proper cleanup
 */

let scrollLockCount = 0;
let originalStyles: {
  overflow: string;
  paddingRight: string;
  position: string;
  top: string;
  width: string;
} | null = null;
let scrollY = 0;
let scrollbarWidth = 0;

/**
 * Lock body scrolling and return cleanup function
 * Uses reference counting for nested dialogs
 */
export function lockBodyScroll(): () => void {
  scrollLockCount++;

  if (scrollLockCount === 1) {
    // First lock - calculate and save original styles
    originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    // Save current scroll position
    scrollY = window.scrollY;

    // Calculate scrollbar width to prevent layout shift
    scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Apply scroll lock styles
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Dispatch custom event for other components
    document.dispatchEvent(
      new CustomEvent('dialog:scroll-locked', {
        detail: { lockCount: scrollLockCount },
      })
    );
  }

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);

    if (scrollLockCount === 0 && originalStyles) {
      // Last unlock - restore original styles
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.paddingRight = originalStyles.paddingRight;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.width = originalStyles.width;

      // Restore scroll position
      window.scrollTo(0, scrollY);

      // Reset saved values
      originalStyles = null;
      scrollY = 0;
      scrollbarWidth = 0;

      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('dialog:scroll-unlocked'));
    }
  };
}

/**
 * Get current scroll lock count
 */
export function getScrollLockCount(): number {
  return scrollLockCount;
}

/**
 * Check if body scroll is currently locked
 */
export function isBodyScrollLocked(): boolean {
  return scrollLockCount > 0;
}

/**
 * Get the scrollbar width that was calculated
 */
export function getScrollbarWidth(): number {
  return scrollbarWidth;
}

/**
 * Emergency unlock - force reset all scroll locks
 * Use only in edge cases where normal cleanup fails
 */
export function emergencyUnlockScroll(): void {
  if (originalStyles) {
    document.body.style.overflow = originalStyles.overflow;
    document.body.style.paddingRight = originalStyles.paddingRight;
    document.body.style.position = originalStyles.position;
    document.body.style.top = originalStyles.top;
    document.body.style.width = originalStyles.width;
  } else {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }

  scrollLockCount = 0;
  originalStyles = null;
  scrollY = 0;
  scrollbarWidth = 0;
}
