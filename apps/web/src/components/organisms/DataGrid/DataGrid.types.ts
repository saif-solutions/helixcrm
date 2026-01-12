// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\DataGrid\DataGrid.types.ts
import * as React from 'react';

/**
 * Column definition for DataGrid
 */
export interface Column<T> {
  /** Column key (unique identifier) */
  key: string;
  
  /** Column header title */
  title: string;
  
  /** Column width (CSS value) */
  width?: string;
  
  /** Whether column is sortable */
  sortable?: boolean;
  
  /** Custom cell renderer */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  
  /** Data accessor key or function */
  accessor?: keyof T | ((row: T) => any);
  
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Whether column is sticky */
  sticky?: boolean;
  
  /** Custom header renderer */
  headerRender?: (column: Column<T>) => React.ReactNode;
}

/**
 * Main DataGrid props with comprehensive JSDoc
 */
export interface DataGridProps<T extends Record<string, any>> {
  /** Data rows */
  data: T[];
  
  /** Column definitions */
  columns: Column<T>[];
  
  /** Unique row identifier key */
  rowKey?: keyof T;
  
  /** Whether to show selection checkboxes */
  selectable?: boolean;
  
  /** Selected row keys */
  selectedRows?: string[];
  
  /** Callback when selection changes */
  onSelectionChange?: (selected: string[]) => void;
  
  /** Sort configuration */
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  
  /** Callback when sort changes */
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  
  /** Loading state */
  loading?: boolean;
  
  /** Empty state message */
  emptyMessage?: string;
  
  /** Whether to show striped rows */
  striped?: boolean;
  
  /** Whether rows are hoverable */
  hoverable?: boolean;
  
  /** Compact mode */
  compact?: boolean;
  
  /** Custom row class name */
  rowClassName?: string | ((row: T, index: number) => string);
  
  /** Custom header class name */
  headerClassName?: string;
  
  /** Custom cell class name */
  cellClassName?: string | ((column: Column<T>, row: T, index: number) => string);
  
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number) => void;
  
  /** Row actions */
  actions?: (row: T, index: number) => React.ReactNode;
  
  /** Bulk actions */
  bulkActions?: React.ReactNode;
  
  /** Pagination configuration */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  
  /** Custom class name */
  className?: string;
  
  /** Custom style */
  style?: React.CSSProperties;
  
  /** ARIA label for accessibility */
  'aria-label'?: string;
  
  /** ARIA describedby for accessibility */
  'aria-describedby'?: string;
}

/**
 * DataGrid ref type
 */
export type DataGridRef = HTMLDivElement;

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Sort state
 */
export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Selection state
 */
export interface SelectionState {
  selectedRows: string[];
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

/**
 * DataGrid internal state
 */
export interface DataGridState<T extends Record<string, any>> {
  /** Current pagination state */
  pagination: PaginationState;
  
  /** Current sort state */
  sort: SortState | null;
  
  /** Current selection state */
  selection: SelectionState;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Current visible data (after filtering/sorting) */
  visibleData: T[];
}

/**
 * Checkbox props for selection
 */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

/**
 * Type guard to check if column is sortable
 */
export function isColumnSortable<T>(column: Column<T>): boolean {
  return !!column.sortable;
}

/**
 * Type guard to check if column has custom renderer
 */
export function hasColumnRenderer<T>(column: Column<T>): boolean {
  return !!column.render;
}

/**
 * Type guard to check if data grid has actions
 */
export function hasDataGridActions<T extends Record<string, any>>(
  props: Pick<DataGridProps<T>, 'actions'>
): boolean {
  return !!props.actions;
}

/**
 * Type guard to check if data grid has pagination
 */
export function hasDataGridPagination<T extends Record<string, any>>(
  props: Pick<DataGridProps<T>, 'pagination'>
): boolean {
  return !!props.pagination;
}

/**
 * Type guard to check if data grid is selectable
 */
export function isDataGridSelectable<T extends Record<string, any>>(
  props: Pick<DataGridProps<T>, 'selectable'>
): boolean {
  return !!props.selectable;
}

/**
 * Get cell value from row using column accessor
 */
export function getCellValue<T extends Record<string, any>>(row: T, column: Column<T>): any {
  if (column.accessor) {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor as keyof T];
  }
  return row[column.key as keyof T];
}

/**
 * Get row ID from row using rowKey
 */
export function getRowId<T extends Record<string, any>>(row: T, rowKey: keyof T): string {
  const value = row[rowKey];
  return String(value);
}

/**
 * Calculate selection state
 */
export function calculateSelectionState(
  selectedRows: string[],
  totalRows: number
): { isAllSelected: boolean; isIndeterminate: boolean } {
  const isAllSelected = totalRows > 0 && selectedRows.length === totalRows;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < totalRows;
  
  return { isAllSelected, isIndeterminate };
}

/**
 * Get pagination range information
 */
export function getPaginationRange(
  page: number,
  pageSize: number,
  total: number
): { startItem: number; endItem: number; totalPages: number } {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  
  return { startItem, endItem, totalPages };
}

/**
 * Get sort direction for next click
 */
export function getNextSortDirection(
  currentColumn: string,
  currentDirection: 'asc' | 'desc',
  clickedColumn: string
): 'asc' | 'desc' {
  if (currentColumn === clickedColumn) {
    return currentDirection === 'asc' ? 'desc' : 'asc';
  }
  return 'asc';
}

/**
 * Accessibility utilities for DataGrid
 */
export const dataGridAria = {
  /**
   * Get ARIA label for sortable header
   */
  getSortableHeaderLabel: (title: string, sorted: boolean, direction: 'asc' | 'desc' | null): string => {
    if (!sorted) return `${title}, click to sort`;
    return `${title}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}, click to sort`;
  },
  
  /**
   * Get ARIA label for row selection checkbox
   */
  getRowSelectionLabel: (rowId: string, selected: boolean): string => {
    return selected ? `Deselect row ${rowId}` : `Select row ${rowId}`;
  },
  
  /**
   * Get ARIA label for select all checkbox
   */
  getSelectAllLabel: (selectedAll: boolean, indeterminate: boolean): string => {
    if (indeterminate) return 'Select all rows (some rows selected)';
    return selectedAll ? 'Deselect all rows' : 'Select all rows';
  },
};