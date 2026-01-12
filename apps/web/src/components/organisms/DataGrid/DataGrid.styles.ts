// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\DataGrid\DataGrid.styles.ts
import { cn } from '../../../lib/utils';

/**
 * Design tokens for DataGrid component
 */
export const dataGridTokens = {
  // Spacing tokens
  spacing: {
    cell: {
      compact: 'px-4 py-2',
      default: 'px-4 py-3',
    },
    header: 'px-4 py-3',
    pagination: 'px-4 py-3',
  },
  
  // Color tokens
  colors: {
    background: {
      default: 'bg-white',
      header: 'bg-gray-50',
      stripe: 'bg-gray-50/50',
      hover: 'bg-gray-100',
    },
    border: {
      default: 'border-gray-200',
      divider: 'divide-gray-200',
    },
    text: {
      header: 'text-gray-500',
      cell: 'text-gray-900',
      disabled: 'text-gray-400',
    },
  },
  
  // Typography tokens
  typography: {
    header: 'text-xs font-medium uppercase tracking-wider',
    cell: {
      compact: 'text-sm',
      default: 'text-sm',
    },
  },
  
  // Border tokens
  borderRadius: 'rounded-lg',
  
  // Transition tokens
  transition: 'transition-colors duration-150',
};

/**
 * CSS class definitions for DataGrid component
 */
export const dataGridClasses = {
  // Container classes
  container: 'flex flex-col',
  
  // Table wrapper classes
  tableWrapper: 'overflow-x-auto border border-gray-200 rounded-lg',
  
  // Table classes
  table: 'min-w-full divide-y divide-gray-200',
  
  // Header classes
  header: {
    container: 'bg-gray-50',
    cell: cn(
      dataGridTokens.spacing.header,
      dataGridTokens.typography.header,
      dataGridTokens.colors.text.header
    ),
    sticky: 'sticky left-0 bg-gray-50 z-10',
    sortable: 'cursor-pointer select-none',
  },
  
  // Body classes
  body: 'bg-white divide-y divide-gray-200',
  
  // Row classes
  row: {
    base: cn(dataGridTokens.transition),
    stripe: 'bg-gray-50/50',
    hover: 'hover:bg-gray-100',
    clickable: 'cursor-pointer',
  },
  
  // Cell classes
  cell: {
    base: cn('whitespace-nowrap', dataGridTokens.colors.text.cell),
    compact: dataGridTokens.spacing.cell.compact,
    default: dataGridTokens.spacing.cell.default,
    sticky: 'sticky left-0 bg-inherit',
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  
  // Empty state classes
  emptyState: {
    container: 'px-4 py-12 text-center',
    content: 'flex flex-col items-center justify-center text-gray-500',
  },
  
  // Loading state classes
  loadingState: {
    container: 'px-4 py-12 text-center',
    content: 'flex flex-col items-center justify-center',
  },
  
  // Pagination classes
  pagination: {
    container: 'flex items-center justify-between px-4 py-3 border-t border-gray-200',
    info: 'text-sm text-gray-700',
    buttons: 'flex items-center gap-2',
    pageButton: 'min-w-[2rem]',
  },
  
  // Checkbox classes
  checkbox: cn(
    'h-4 w-4 rounded border-gray-300 text-primary-600',
    'focus:ring-primary-500 focus:ring-offset-0',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  
  // Bulk actions classes
  bulkActions: 'flex items-center gap-2',
  
  // Sort icon classes
  sortIcon: {
    container: 'flex flex-col',
    icon: cn('text-gray-400'),
    active: 'text-primary-600',
  },
};

/**
 * Utility function to build table wrapper classes
 */
export function getTableWrapperClasses(className?: string): string {
  return cn(dataGridClasses.tableWrapper, className);
}

/**
 * Utility function to build table classes
 */
export function getTableClasses(className?: string): string {
  return cn(dataGridClasses.table, className);
}

/**
 * Utility function to build header cell classes
 */
export function getHeaderCellClasses(
  column: { align?: 'left' | 'center' | 'right'; sticky?: boolean; width?: string },
  className?: string
): string {
  return cn(
    dataGridClasses.header.cell,
    column.align === 'center' && 'text-center',
    column.align === 'right' && 'text-right',
    column.sticky && dataGridClasses.header.sticky,
    className
  );
}

/**
 * Utility function to build row classes
 */
export function getRowClasses(
  index: number,
  striped: boolean,
  hoverable: boolean,
  clickable: boolean,
  rowClassName?: string | ((row: any, index: number) => string),
  row?: any
): string {
  const baseClasses = cn(
    dataGridClasses.row.base,
    index % 2 === 0 && striped && dataGridClasses.row.stripe,
    hoverable && dataGridClasses.row.hover,
    clickable && dataGridClasses.row.clickable
  );
  
  // Handle function rowClassName
  if (typeof rowClassName === 'function' && row) {
    const dynamicClass = rowClassName(row, index);
    return cn(baseClasses, dynamicClass);
  }
  
  // Handle string rowClassName
  if (typeof rowClassName === 'string') {
    return cn(baseClasses, rowClassName);
  }
  
  return baseClasses;
}

/**
 * Utility function to build cell classes
 */
export function getCellClasses(
  column: { align?: 'left' | 'center' | 'right'; sticky?: boolean },
  compact: boolean,
  cellClassName?: string | ((column: any, row: any, index: number) => string),
  columnObj?: any,
  row?: any,
  index?: number
): string {
  const baseClasses = cn(
    dataGridClasses.cell.base,
    compact ? dataGridClasses.cell.compact : dataGridClasses.cell.default,
    column.align === 'center' && dataGridClasses.cell.align.center,
    column.align === 'right' && dataGridClasses.cell.align.right,
    column.sticky && dataGridClasses.cell.sticky
  );
  
  if (typeof cellClassName === 'function' && columnObj && row !== undefined && index !== undefined) {
    const dynamicClass = cellClassName(columnObj, row, index);
    return cn(baseClasses, dynamicClass);
  }
  
  if (typeof cellClassName === 'string') {
    return cn(baseClasses, cellClassName);
  }
  
  return baseClasses;
}

/**
 * Utility function to build checkbox classes
 */
export function getCheckboxClasses(className?: string): string {
  return cn(dataGridClasses.checkbox, className);
}

/**
 * Utility function to build sort icon classes
 */
export function getSortIconClasses(isActive: boolean): string {
  return cn(
    dataGridClasses.sortIcon.icon,
    isActive && dataGridClasses.sortIcon.active
  );
}

/**
 * Default DataGrid style props
 */
export const defaultDataGridProps = {
  selectable: false,
  loading: false,
  emptyMessage: 'No data available',
  striped: true,
  hoverable: true,
  compact: false,
};

export type DataGridStyleProps = typeof defaultDataGridProps;