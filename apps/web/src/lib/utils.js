/**
 * Utility functions for class name merging
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
