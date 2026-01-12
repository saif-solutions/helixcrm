// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\DataGrid\index.ts
// Re-export main DataGrid component
export { DataGrid } from './DataGrid';

// Re-export types
export type {
  DataGridProps,
  DataGridRef,
  Column,
  PaginationState,
  SortState,
  SelectionState,
  DataGridState,
  CheckboxProps,
} from './DataGrid.types';

// Re-export type utilities
export {
  isColumnSortable,
  hasColumnRenderer,
  hasDataGridActions,
  hasDataGridPagination,
  isDataGridSelectable,
  getCellValue,
  getRowId,
  calculateSelectionState,
  getPaginationRange,
  getNextSortDirection,
  dataGridAria,
} from './DataGrid.types';

// Re-export style utilities
export {
  dataGridTokens,
  dataGridClasses,
  getTableWrapperClasses,
  getTableClasses,
  getHeaderCellClasses,
  getRowClasses,
  getCellClasses,
  getCheckboxClasses,
  getSortIconClasses,
  defaultDataGridProps,
} from './DataGrid.styles';

// Re-export sub-components
export {
  Checkbox,
  SortIcon,
  EmptyState,
  LoadingState,
  type SortIconProps,
  type EmptyStateProps,
  type LoadingStateProps,
} from './DataGrid.components';