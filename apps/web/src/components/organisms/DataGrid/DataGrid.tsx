// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\DataGrid\DataGrid.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';

// Import types from dedicated file
import type {
  DataGridProps as DataGridPropsType,
  DataGridRef,
} from './DataGrid.types';

// Import utility functions from types file
import {
  getCellValue,
  getRowId,
  dataGridAria,
} from './DataGrid.types';

// Import styles from dedicated file
import {
  dataGridClasses,
  getTableWrapperClasses,
  getTableClasses,
  getHeaderCellClasses,
  getRowClasses,
  getCellClasses,
  defaultDataGridProps,
} from './DataGrid.styles';

// Import components from dedicated file
import { Checkbox, SortIcon, EmptyState, LoadingState } from './DataGrid.components';

// Define internal utility functions (not exported from types file)
const calculateSelectionStateInternal = (
  selectedRows: string[],
  totalRows: number
): { isAllSelected: boolean; isIndeterminate: boolean } => {
  const isAllSelected = totalRows > 0 && selectedRows.length === totalRows;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < totalRows;
  return { isAllSelected, isIndeterminate };
};

const getPaginationRangeInternal = (
  page: number,
  pageSize: number,
  total: number
): { startItem: number; endItem: number; totalPages: number } => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  return { startItem, endItem, totalPages };
};

const getNextSortDirectionInternal = (
  currentColumn: string,
  currentDirection: 'asc' | 'desc',
  clickedColumn: string
): 'asc' | 'desc' => {
  if (currentColumn === clickedColumn) {
    return currentDirection === 'asc' ? 'desc' : 'asc';
  }
  return 'asc';
};

// Create a non-generic version first, then cast it
const DataGridInner = React.forwardRef<DataGridRef, DataGridPropsType<any>>(
  (props, ref) => {
    const {
      data,
      columns,
      rowKey = 'id',
      selectable = defaultDataGridProps.selectable,
      selectedRows = [],
      onSelectionChange,
      sort,
      onSortChange,
      loading = defaultDataGridProps.loading,
      emptyMessage = defaultDataGridProps.emptyMessage,
      striped = defaultDataGridProps.striped,
      hoverable = defaultDataGridProps.hoverable,
      compact = defaultDataGridProps.compact,
      rowClassName,
      headerClassName,
      cellClassName,
      onRowClick,
      actions,
      bulkActions,
      pagination,
      className,
      style,
      'aria-label': ariaLabel = 'Data table',
      'aria-describedby': ariaDescribedBy,
    } = props;

    // State for internal selection management (for uncontrolled mode)
    const [internalSelected, setInternalSelected] = React.useState<string[]>(selectedRows);
    const isControlled = selectedRows !== undefined && onSelectionChange !== undefined;
    const currentSelected = isControlled ? selectedRows : internalSelected;

    // Calculate selection state
    const { isAllSelected, isIndeterminate } = calculateSelectionStateInternal(
      currentSelected,
      data.length
    );

    // Handler: Select all rows
    const handleSelectAll = (checked: boolean) => {
      const allIds = data.map(row => getRowId(row, rowKey));
      const newSelected = checked ? allIds : [];

      if (isControlled) {
        onSelectionChange?.(newSelected);
      } else {
        setInternalSelected(newSelected);
      }
    };

    // Handler: Select single row
    const handleSelectRow = (rowId: string, checked: boolean) => {
      const newSelected = checked
        ? [...currentSelected, rowId]
        : currentSelected.filter(id => id !== rowId);

      if (isControlled) {
        onSelectionChange?.(newSelected);
      } else {
        setInternalSelected(newSelected);
      }
    };

    // Handler: Sort column
    const handleSort = (columnKey: string) => {
      if (!onSortChange || !sort) return;

      const newDirection = getNextSortDirectionInternal(sort.column, sort.direction, columnKey);
      onSortChange(columnKey, newDirection);
    };

    // Render: Table header
    const renderHeader = () => (
      <thead className={cn(dataGridClasses.header.container, headerClassName)}>
        <tr>
          {selectable && (
            <th
              className={getHeaderCellClasses(
                { align: 'left', sticky: true },
                'bg-gray-50'
              )}
              scope="col"
            >
              <div className="flex items-center">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleSelectAll(e.target.checked)
                  }
                  aria-label={dataGridAria.getSelectAllLabel(isAllSelected, isIndeterminate)}
                />
              </div>
            </th>
          )}

          {columns.map((column) => {
            const isSorted = sort?.column === column.key;
            const sortDirection = isSorted ? sort.direction : null;
            const sortAriaLabel = dataGridAria.getSortableHeaderLabel(
              column.title,
              isSorted,
              sortDirection
            );

            return (
              <th
                key={column.key}
                className={getHeaderCellClasses(
                  {
                    align: column.align || 'left',
                    sticky: column.sticky,
                    width: column.width,
                  },
                  column.sortable ? dataGridClasses.header.sortable : undefined
                )}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
                aria-sort={
                  isSorted
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                aria-label={column.sortable ? sortAriaLabel : undefined}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div
                  className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}
                >
                  {column.headerRender
                    ? column.headerRender(column)
                    : (
                      <>
                        <span>{column.title}</span>
                        {column.sortable && (
                          <SortIcon
                            isSorted={isSorted}
                            direction={sortDirection}
                            size={compact ? 'xs' : 'sm'}
                          />
                        )}
                      </>
                    )}
                </div>
              </th>
            );
          })}

          {actions && (
            <th
              className={getHeaderCellClasses({ align: 'left' }, 'bg-gray-50')}
              scope="col"
            >
              Actions
            </th>
          )}
        </tr>
      </thead>
    );

    // Render: Data rows
    const renderDataRows = () => (
      <tbody className={dataGridClasses.body}>
        {data.map((row, index) => {
          const rowId = getRowId(row, rowKey);
          const isSelected = currentSelected.includes(rowId);
          const rowClasses = getRowClasses(
            index,
            striped,
            hoverable,
            !!onRowClick,
            rowClassName,
            row
          );

          return (
            <tr
              key={rowId}
              className={rowClasses}
              onClick={() => onRowClick?.(row, index)}
              aria-selected={selectable ? isSelected : undefined}
            >
              {selectable && (
                <td
                  className={getCellClasses(
                    { align: 'left', sticky: true },
                    compact,
                    cellClassName,
                    columns[0],
                    row,
                    index
                  )}
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSelectRow(rowId, e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={dataGridAria.getRowSelectionLabel(rowId, isSelected)}
                    />
                  </div>
                </td>
              )}

              {columns.map((column) => {
                const cellValue = getCellValue(row, column);
                const cellClasses = getCellClasses(
                  { align: column.align || 'left', sticky: column.sticky },
                  compact,
                  cellClassName,
                  column,
                  row,
                  index
                );

                return (
                  <td key={`${rowId}-${column.key}`} className={cellClasses}>
                    {column.render
                      ? column.render(cellValue, row, index)
                      : <div className={cn(column.align === 'right' && 'text-right')}>
                          {cellValue}
                        </div>
                    }
                  </td>
                );
              })}

              {actions && (
                <td
                  className={getCellClasses(
                    { align: 'left' },
                    compact,
                    cellClassName,
                    columns[columns.length - 1],
                    row,
                    index
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {actions(row, index)}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    );

    // Render: Pagination
    const renderPagination = () => {
      if (!pagination) return null;

      const { page, pageSize, total, onPageChange } = pagination;
      const { startItem, endItem, totalPages } = getPaginationRangeInternal(page, pageSize, total);

      return (
        <div className={dataGridClasses.pagination.container}>
          <div className="flex items-center gap-4">
            {bulkActions && currentSelected.length > 0 && (
              <div className={dataGridClasses.bulkActions}>
                <span className="text-sm text-gray-700">
                  {currentSelected.length} selected
                </span>
                {bulkActions}
              </div>
            )}

            <div className={dataGridClasses.pagination.info}>
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </div>
          </div>

          <div className={dataGridClasses.pagination.buttons}>
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={cn(
                      'min-w-[2rem] px-2 py-1.5 text-sm font-medium rounded-md',
                      pageNum === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                    )}
                    onClick={() => onPageChange(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="px-2 text-gray-500">...</span>
                  <button
                    type="button"
                    className="min-w-[2rem] px-2 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                    onClick={() => onPageChange(totalPages)}
                    aria-label={`Page ${totalPages}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      );
    };

    // Main render
    return (
      <div
        ref={ref}
        className={cn(dataGridClasses.container, className)}
        style={style}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        role="region"
        tabIndex={0}
      >
        <div className={getTableWrapperClasses()}>
          <table
            className={getTableClasses()}
            role="grid"
            aria-multiselectable={selectable ? 'true' : undefined}
          >
            {renderHeader()}

            {loading ? (
              <tbody>
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  >
                    <LoadingState message="Loading data..." />
                  </td>
                </tr>
              </tbody>
            ) : data.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  >
                    <EmptyState message={emptyMessage} />
                  </td>
                </tr>
              </tbody>
            ) : (
              renderDataRows()
            )}
          </table>
        </div>

        {renderPagination()}
      </div>
    );
  }
);

// Set display name
DataGridInner.displayName = 'DataGrid';

// Create typed generic component
type GenericDataGrid = <T extends Record<string, any>>(
  props: DataGridPropsType<T> & React.RefAttributes<DataGridRef>
) => React.ReactElement;

// Cast to generic component with displayName
const DataGrid = DataGridInner as GenericDataGrid & { displayName?: string };
DataGrid.displayName = 'DataGrid';

// Export the component
export { DataGrid };