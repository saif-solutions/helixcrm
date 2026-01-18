// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\Kanban.styles.ts
import { KanbanColor, KanbanPriority } from './Kanban.types';

/**
 * Design tokens for Kanban component
 * Enterprise-grade with CRM-specific optimizations
 */
export const kanbanTokens = {
  // Spacing tokens (in rem units - 4px base)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
  },
  
  // Column dimensions
  column: {
    minWidth: '280px',      // Minimum column width
    maxWidth: '380px',      // Maximum column width
    headerHeight: '3rem',   // Column header height
    footerHeight: '2.5rem', // Column footer height
    gap: '1rem',           // Gap between columns
  },
  
  // Card dimensions
  card: {
    minHeight: '5rem',     // Minimum card height
    maxHeight: '12rem',    // Maximum card height (before scroll)
    padding: '0.75rem',    // Card internal padding
    borderRadius: '0.375rem', // Card border radius
    marginBottom: '0.5rem', // Space between cards
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
  
  // Shadow tokens
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  // Z-index layers
  zIndex: {
    card: 10,
    column: 20,
    dragging: 100,
    overlay: 1000,
  },
};

/**
 * CSS class definitions for Kanban component
 * Tailwind-compatible with dark mode support
 */
export const kanbanClasses = {
  // Base container classes
  base: [
    'relative',
    'flex',
    'overflow-x-auto',
    'overflow-y-hidden',
    'p-4',
    'gap-4',
    'min-h-[400px]',
    'bg-gray-50',
    'dark:bg-gray-900',
    'rounded-lg',
    'transition-all',
    'duration-200',
  ].join(' '),
  
  // Loading state
  loading: [
    'opacity-70',
    'cursor-wait',
    'select-none',
  ].join(' '),
  
  // Empty state
  empty: [
    'flex',
    'items-center',
    'justify-center',
    'h-64',
    'text-gray-400',
    'dark:text-gray-500',
    'text-lg',
    'font-medium',
  ].join(' '),
  
  // Error state
  error: [
    'flex',
    'items-center',
    'justify-center',
    'h-64',
    'text-error-600',
    'dark:text-error-400',
    'text-lg',
    'font-medium',
    'p-8',
    'border',
    'border-error-200',
    'dark:border-error-800',
    'rounded-lg',
    'bg-error-50',
    'dark:bg-error-900/20',
  ].join(' '),
  
  // Column classes
  column: {
    base: [
      'relative',
      'flex',
      'flex-col',
      'flex-shrink-0',
      'w-72',
      'min-h-[500px]',
      'bg-white',
      'dark:bg-gray-800',
      'rounded-lg',
      'shadow-md',
      'border',
      'border-gray-200',
      'dark:border-gray-700',
      'transition-all',
      'duration-200',
    ].join(' '),
    
    // Column color variants
    color: {
      primary: 'border-primary-200 dark:border-primary-800',
      secondary: 'border-secondary-200 dark:border-secondary-800',
      success: 'border-success-200 dark:border-success-800',
      error: 'border-error-200 dark:border-error-800',
      warning: 'border-warning-200 dark:border-warning-800',
      info: 'border-info-200 dark:border-info-800',
      gray: 'border-gray-200 dark:border-gray-700',
    },
    
    // Column states
    state: {
      dragging: [
        'opacity-50',
        'border-dashed',
        'border-2',
        'border-primary-400',
        'dark:border-primary-600',
        'bg-primary-50',
        'dark:bg-primary-900/20',
      ].join(' '),
      over: [
        'ring-2',
        'ring-primary-500',
        'dark:ring-primary-400',
        'ring-offset-1',
        'ring-offset-white',
        'dark:ring-offset-gray-800',
      ].join(' '),
      collapsed: [
        'w-16',
        'min-h-0',
        'overflow-hidden',
      ].join(' '),
    },
    
    // Column header
    header: [
      'flex',
      'items-center',
      'justify-between',
      'px-4',
      'py-3',
      'border-b',
      'border-gray-200',
      'dark:border-gray-700',
      'bg-gray-50',
      'dark:bg-gray-800',
      'rounded-t-lg',
      'sticky',
      'top-0',
      'z-10',
    ].join(' '),
    
    // Column body (cards container)
    body: [
      'flex-1',
      'p-3',
      'overflow-y-auto',
      'space-y-2',
      'min-h-[200px]',
      'transition-all',
      'duration-200',
    ].join(' '),
    
    // Column footer
    footer: [
      'px-4',
      'py-3',
      'border-t',
      'border-gray-200',
      'dark:border-gray-700',
      'bg-gray-50',
      'dark:bg-gray-800',
      'rounded-b-lg',
      'sticky',
      'bottom-0',
    ].join(' '),
    
    // Card count badge
    count: [
      'inline-flex',
      'items-center',
      'justify-center',
      'px-2',
      'py-0.5',
      'text-xs',
      'font-semibold',
      'rounded-full',
      'bg-gray-100',
      'dark:bg-gray-700',
      'text-gray-700',
      'dark:text-gray-300',
      'min-w-[1.5rem]',
    ].join(' '),
    
    // WIP limit indicator
    wipLimit: {
      base: [
        'text-xs',
        'font-medium',
        'px-2',
        'py-1',
        'rounded',
        'transition-colors',
        'duration-200',
      ].join(' '),
      under: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      at: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
      over: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
    },
  },
  
  // Card classes
  card: {
    base: [
      'relative',
      'p-3',
      'bg-white',
      'dark:bg-gray-800',
      'rounded',
      'shadow-sm',
      'border',
      'border-gray-200',
      'dark:border-gray-700',
      'cursor-pointer',
      'hover:shadow-md',
      'hover:border-gray-300',
      'dark:hover:border-gray-600',
      'transition-all',
      'duration-200',
      'select-none',
      'group',
    ].join(' '),
    
    // Card states
    state: {
      dragging: [
        'opacity-50',
        'shadow-lg',
        'rotate-1',
        'scale-105',
        'z-50',
      ].join(' '),
      over: [
        'border-dashed',
        'border-2',
        'border-primary-400',
        'dark:border-primary-600',
        'bg-primary-50',
        'dark:bg-primary-900/20',
        'mt-6', // Creates visual space for drop indicator
      ].join(' '),
      selected: [
        'ring-2',
        'ring-primary-500',
        'dark:ring-primary-400',
        'ring-offset-1',
      ].join(' '),
      archived: [
        'opacity-60',
        'bg-gray-50',
        'dark:bg-gray-900',
        'border-dashed',
      ].join(' '),
    },
    
    // Priority indicators
    priority: {
      low: 'border-l-4 border-l-success-500 dark:border-l-success-400',
      medium: 'border-l-4 border-l-warning-500 dark:border-l-warning-400',
      high: 'border-l-4 border-l-error-500 dark:border-l-error-400',
      critical: [
        'border-l-4',
        'border-l-error-600',
        'dark:border-l-error-500',
        'bg-error-50/30',
        'dark:bg-error-900/20',
      ].join(' '),
    },
    
    // Card header (title area)
    header: [
      'flex',
      'items-start',
      'justify-between',
      'gap-2',
      'mb-2',
    ].join(' '),
    
    // Card body (content area)
    body: [
      'text-sm',
      'text-gray-600',
      'dark:text-gray-400',
      'line-clamp-3',
      'mb-3',
    ].join(' '),
    
    // Card footer (metadata area)
    footer: [
      'flex',
      'items-center',
      'justify-between',
      'text-xs',
      'text-gray-500',
      'dark:text-gray-500',
    ].join(' '),
    
    // Tags container
    tags: [
      'flex',
      'flex-wrap',
      'gap-1',
      'mt-2',
    ].join(' '),
    
    // Individual tag
    tag: [
      'inline-flex',
      'items-center',
      'px-2',
      'py-0.5',
      'text-xs',
      'font-medium',
      'rounded-full',
      'bg-gray-100',
      'dark:bg-gray-700',
      'text-gray-700',
      'dark:text-gray-300',
      'max-w-[120px]',
      'truncate',
    ].join(' '),
    
    // Due date indicator
    dueDate: {
      base: [
        'inline-flex',
        'items-center',
        'gap-1',
        'px-2',
        'py-0.5',
        'text-xs',
        'font-medium',
        'rounded',
      ].join(' '),
      upcoming: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      today: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
      overdue: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
      none: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
    
    // Avatar/assigned user
    avatar: [
      'flex-shrink-0',
      'w-6',
      'h-6',
      'border-2',
      'border-white',
      'dark:border-gray-800',
    ].join(' '),
  },
  
  // Action buttons
  action: {
    base: [
      'inline-flex',
      'items-center',
      'justify-center',
      'p-1',
      'rounded',
      'text-gray-500',
      'dark:text-gray-400',
      'hover:text-gray-700',
      'dark:hover:text-gray-300',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-700',
      'transition-colors',
      'duration-150',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-1',
      'focus:ring-primary-500',
    ].join(' '),
    add: 'text-success-600 dark:text-success-400 hover:text-success-800 dark:hover:text-success-300',
    delete: 'text-error-600 dark:text-error-400 hover:text-error-800 dark:hover:text-error-300',
    edit: 'text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300',
    more: 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300',
  },
  
  // Drag and drop
  drag: {
    placeholder: [
      'h-2',
      'bg-primary-200',
      'dark:bg-primary-800',
      'rounded',
      'mb-2',
      'transition-all',
      'duration-200',
    ].join(' '),
    ghost: [
      'fixed',
      'z-[1000]',
      'pointer-events-none',
      'opacity-80',
      'scale-105',
      'rotate-3',
      'shadow-xl',
    ].join(' '),
  },
  
  // Accessibility
  accessibility: {
    focus: [
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'dark:focus:ring-primary-400',
      'focus:ring-offset-1',
      'focus:ring-offset-white',
      'dark:focus:ring-offset-gray-800',
    ].join(' '),
    screenReaderOnly: [
      'sr-only',
    ].join(' '),
  },
};

/**
 * Utility function to build Kanban container classes
 */
export function getKanbanClasses(
  loading?: boolean,
  error?: string,
  className?: string
): string {
  const classes = [
    kanbanClasses.base,
    loading ? kanbanClasses.loading : '',
    error ? kanbanClasses.error : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build column classes
 */
export function getColumnClasses(
  color?: KanbanColor,
  isDragging?: boolean,
  isOver?: boolean,
  isCollapsed?: boolean,
  className?: string
): string {
  const classes = [
    kanbanClasses.column.base,
    color ? kanbanClasses.column.color[color] : kanbanClasses.column.color.gray,
    isDragging ? kanbanClasses.column.state.dragging : '',
    isOver ? kanbanClasses.column.state.over : '',
    isCollapsed ? kanbanClasses.column.state.collapsed : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build card classes
 */
export function getCardClasses(
  priority?: KanbanPriority,
  isDragging?: boolean,
  isOver?: boolean,
  isSelected?: boolean,
  isArchived?: boolean,
  className?: string
): string {
  const classes = [
    kanbanClasses.card.base,
    priority ? kanbanClasses.card.priority[priority] : '',
    isDragging ? kanbanClasses.card.state.dragging : '',
    isOver ? kanbanClasses.card.state.over : '',
    isSelected ? kanbanClasses.card.state.selected : '',
    isArchived ? kanbanClasses.card.state.archived : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get due date status class
 */
/**
 * Utility function to get due date status class
 */
export function getDueDateClass(dueDate?: Date | string): string {
  if (!dueDate) return kanbanClasses.card.dueDate.none;
  
  // Handle both Date objects and strings
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
  
  // Check for invalid date
  if (isNaN(date.getTime())) return kanbanClasses.card.dueDate.none;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return kanbanClasses.card.dueDate.overdue;      // Overdue
  if (diffDays === 0) return kanbanClasses.card.dueDate.today;      // Today
  if (diffDays <= 3) return kanbanClasses.card.dueDate.upcoming;    // Upcoming (within 3 days)
  
  return kanbanClasses.card.dueDate.none;                           // Future or no date
}

/**
 * Utility function to get WIP limit status class
 */
// Update getWipLimitClass function:
export function getWipLimitClass(current: number, limit?: number): string {
  if (!limit) return kanbanClasses.column.wipLimit.base;
  
  if (current > limit) return `${kanbanClasses.column.wipLimit.base} ${kanbanClasses.column.wipLimit.over}`;
  if (current === limit) return `${kanbanClasses.column.wipLimit.base} ${kanbanClasses.column.wipLimit.at}`;
  
  return `${kanbanClasses.column.wipLimit.base} ${kanbanClasses.column.wipLimit.under}`;
}

/**
 * Default style props for Kanban
 */
export const defaultKanbanStyleProps = {
  minColumnWidth: kanbanTokens.column.minWidth,
  maxHeight: 'calc(100vh - 200px)',
  transition: 'all 0.2s ease',
};

/**
 * Get appropriate ARIA labels for drag and drop
 */
export function getDragAriaLabel(
  type: 'card' | 'column',
  item: { title: string },
  action: 'dragging' | 'dropped' | 'over'
): string {
  const labels = {
    card: {
      dragging: `Dragging card: ${item.title}. Use arrow keys to move between columns. Press Space to drop.`,
      dropped: `Dropped card: ${item.title}`,
      over: `Drop card here to move to this column`,
    },
    column: {
      dragging: `Dragging column: ${item.title}. Use arrow keys to reorder. Press Space to drop.`,
      dropped: `Dropped column: ${item.title}`,
      over: `Drop column here to reorder`,
    },
  };
  
  return labels[type][action];
}