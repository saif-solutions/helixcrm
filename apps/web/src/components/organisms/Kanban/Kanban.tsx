// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\Kanban.tsx
import * as React from 'react';

import { cn } from '../../../lib/utils';
// Add these missing imports at the top:
import {
  KanbanProps,
  KanbanRef,
  KanbanCard,
  KanbanColumn,
  KanbanContextValue,
  KanbanDragState, // ADD THIS
  KanbanAnalytics, // ADD THIS
  KanbanColumnProps, // ADD THIS
  KanbanCardProps, // ADD THIS
  createKanbanCard,
  createKanbanColumn,
  calculateWeightedValue,
  getTimeSinceLastActivity,
} from './Kanban.types';
import {
  kanbanClasses,
  kanbanTokens,
  getKanbanClasses,
  getColumnClasses,
  getCardClasses,
  getWipLimitClass,
  getDragAriaLabel,
  defaultKanbanStyleProps,
} from './Kanban.styles';

const getProbabilityBadgeClass = (probability?: number): string => {
  if (probability === undefined)
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  if (probability >= 80)
    return 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
  if (probability >= 50)
    return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
  return 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200';
};

// Create context for compound components
const KanbanContext = React.createContext<KanbanContextValue | undefined>(undefined);

/**
 * Enterprise Kanban component for CRM pipeline visualization
 *
 * Features:
 * - Drag & drop cards and columns
 * - CRM-specific fields (value, probability, contacts)
 * - WIP limits and analytics
 * - Full accessibility compliance
 * - Dark mode support
 * - Performance optimized with virtualization
 *
 * @example
 * ```tsx
 * <Kanban
 *   columns={pipelineColumns}
 *   onCardClick={(card) => openContact(card.contactId)}
 *   showAnalytics={true}
 * />
 * ```
 */
export const Kanban = React.memo(
  React.forwardRef<KanbanRef, KanbanProps>(
    (
      {
        columns: initialColumns,
        readOnly = false,
        showColumnActions = true,
        showCardActions = true,
        allowColumnReorder = true,
        allowCardReorder = true,
        allowCardMoveBetweenColumns = true,
        maxHeight = defaultKanbanStyleProps.maxHeight,
        minColumnWidth = defaultKanbanStyleProps.minColumnWidth,
        showAnalytics = false,
        analytics,
        showCardValue = true,
        showProbability = true,
        onChange,
        onCardClick,
        onColumnClick,
        onAddCard,
        onAddColumn,
        onDeleteCard,
        onDeleteColumn,
        renderCard,
        renderColumnHeader,
        renderColumnFooter,
        renderAnalytics,
        loading = false,
        error,
        emptyMessage = 'No pipeline data available',
        showCardCounts = true,
        showWipLimits = true,
        className,
        style,
        'data-testid': testId = 'kanban',
        'data-analytics': analyticsId,
        'data-cy': cyId,
        ...props
      }: KanbanProps,
      ref: React.Ref<KanbanRef>
    ) => {
      // State management
      const [columns, setColumns] = React.useState<KanbanColumn[]>(initialColumns);
      const [dragState, setDragState] = React.useState<KanbanDragState>({ type: 'none' });
      const [activeCard, setActiveCard] = React.useState<KanbanCard | undefined>();
      const [activeColumn, setActiveColumn] = React.useState<KanbanColumn | undefined>();

      // Update columns when props change
React.useEffect(() => {
  if (JSON.stringify(initialColumns) !== JSON.stringify(columns)) {
    setColumns(initialColumns);
  }
}, [initialColumns, columns]);

      // Handle card drag start
      const handleCardDragStart = React.useCallback(
        (card: KanbanCard, column: KanbanColumn, event: React.DragEvent) => {
          if (readOnly || !allowCardReorder) return;

          if (!event.dataTransfer) return;

          event.dataTransfer.setData(
            'application/kanban-card',
            JSON.stringify({
              cardId: card.id,
              columnId: column.id,
            })
          );

          setDragState({
            type: 'card',
            draggingCard: card,
            sourceColumn: column,
            position: { x: event.clientX, y: event.clientY },
          });

          // For accessibility
          event.currentTarget.setAttribute('aria-grabbed', 'true');
        },
        [readOnly, allowCardReorder]
      );

      // Handle card drag end
      const handleCardDragEnd = React.useCallback((event: React.DragEvent) => {
        setDragState({ type: 'none' });
        event.currentTarget.setAttribute('aria-grabbed', 'false');
      }, []);

      // Handle card drop
      const handleCardDrop = React.useCallback(
        (targetColumn: KanbanColumn, targetIndex?: number, event?: React.DragEvent) => {
          if (
            readOnly ||
            dragState.type !== 'card' ||
            !dragState.draggingCard ||
            !dragState.sourceColumn
          ) {
            return;
          }

          event?.preventDefault();

          const { draggingCard, sourceColumn } = dragState;

          // If dropping in same column with reorder
          if (sourceColumn.id === targetColumn.id && allowCardReorder) {
            const newCards = [...sourceColumn.cards];
            const sourceIndex = newCards.findIndex((c) => c.id === draggingCard.id);

            if (sourceIndex !== -1) {
              newCards.splice(sourceIndex, 1);
              const insertIndex = targetIndex !== undefined ? targetIndex : newCards.length;
              newCards.splice(insertIndex, 0, draggingCard);

              const updatedColumns = columns.map((col) =>
                col.id === sourceColumn.id ? { ...col, cards: newCards } : col
              );

              setColumns(updatedColumns);
              onChange?.(updatedColumns, draggingCard, sourceColumn, targetColumn);
            }
          }
          // If moving between columns
          else if (allowCardMoveBetweenColumns && sourceColumn.id !== targetColumn.id) {
            const sourceCards = sourceColumn.cards.filter(
              (c: KanbanCard) => c.id !== draggingCard.id
            );
            const targetCards = [...targetColumn.cards];
            const insertIndex = targetIndex !== undefined ? targetIndex : targetCards.length;
            targetCards.splice(insertIndex, 0, draggingCard);

            const updatedColumns = columns.map((col) => {
              if (col.id === sourceColumn.id) {
                return { ...col, cards: sourceCards };
              }
              if (col.id === targetColumn.id) {
                return { ...col, cards: targetCards };
              }
              return col;
            });

            setColumns(updatedColumns);
            onChange?.(updatedColumns, draggingCard, sourceColumn, targetColumn);
          }

          setDragState({ type: 'none' });
        },
        [readOnly, dragState, columns, allowCardReorder, allowCardMoveBetweenColumns, onChange]
      );

      // Handle column drag start
      const handleColumnDragStart = React.useCallback(
        (column: KanbanColumn, event: React.DragEvent) => {
          if (readOnly || !allowColumnReorder) return;

          if (!event.dataTransfer) return;

          event.dataTransfer.setData('application/kanban-column', column.id);
          setDragState({
            type: 'column',
            draggingCard: undefined,
            sourceColumn: column,
            position: { x: event.clientX, y: event.clientY },
          });
        },
        [readOnly, allowColumnReorder]
      );

      // Handle column drop
      const handleColumnDrop = React.useCallback(
        (targetIndex: number, event: React.DragEvent) => {
          if (readOnly || dragState.type !== 'column' || !dragState.sourceColumn) {
            return;
          }

          event.preventDefault();
          const sourceColumn = dragState.sourceColumn;
          const sourceIndex = columns.findIndex((col) => col.id === sourceColumn.id);

          if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
            const newColumns = [...columns];
            const [removed] = newColumns.splice(sourceIndex, 1);
            newColumns.splice(targetIndex, 0, removed);

            setColumns(newColumns);
            onChange?.(newColumns);
          }

          setDragState({ type: 'none' });
        },
        [readOnly, dragState, columns, onChange]
      );

      // Handle delete card
      const handleDeleteCard = React.useCallback(
        (card: KanbanCard, column: KanbanColumn) => {
          if (readOnly) return;

          const updatedColumns = columns.map((col) =>
            col.id === column.id
              ? { ...col, cards: col.cards.filter((c) => c.id !== card.id) }
              : col
          );

          setColumns(updatedColumns);
          onChange?.(updatedColumns, card, column, undefined);
          onDeleteCard?.(card, column);
        },
        [readOnly, columns, onChange, onDeleteCard]
      );

      // Handle add column
      const handleAddColumn = React.useCallback(() => {
        if (readOnly) return;

        const newColumn = createKanbanColumn();
        const updatedColumns = [...columns, newColumn];

        setColumns(updatedColumns);
        onChange?.(updatedColumns);
        onAddColumn?.();
      }, [readOnly, columns, onChange, onAddColumn]);

      // Handle delete column
      const handleDeleteColumn = React.useCallback(
        (column: KanbanColumn) => {
          if (readOnly) return;

          const updatedColumns = columns.filter((col) => col.id !== column.id);
          setColumns(updatedColumns);
          onChange?.(updatedColumns);
          onDeleteColumn?.(column);
        },
        [readOnly, columns, onChange, onDeleteColumn]
      );

      // Handle card click
      const handleCardClick = React.useCallback(
        (card: KanbanCard, column: KanbanColumn, event: React.MouseEvent) => {
          setActiveCard(card);
          onCardClick?.(card, column, event);
        },
        [onCardClick]
      );

      // Handle column click
      const handleColumnClick = React.useCallback(
        (column: KanbanColumn, event: React.MouseEvent) => {
          setActiveColumn(column);
          onColumnClick?.(column, event);
        },
        [onColumnClick]
      );

      // Calculate total pipeline value
      const calculatePipelineValue = React.useCallback(() => {
        return columns.reduce((total, column) => {
          return (
            total +
            column.cards.reduce((colTotal, card) => {
              return colTotal + (card.value || 0);
            }, 0)
          );
        }, 0);
      }, [columns]);

      // Calculate weighted pipeline value
      const calculateWeightedPipelineValue = React.useCallback(() => {
        return columns.reduce((total, column) => {
          return (
            total +
            column.cards.reduce((colTotal, card) => {
              return colTotal + calculateWeightedValue(card);
            }, 0)
          );
        }, 0);
      }, [columns]);

      // Context value
      // Update the contextValue:
      const contextValue: KanbanContextValue = React.useMemo(
        () => ({
          columns,
          setColumns,
          readOnly,
          allowColumnReorder,
          allowCardReorder,
          allowCardMoveBetweenColumns,
          dragState,
          setDragState,
          activeCard,
          setActiveCard,
          activeColumn,
          setActiveColumn,
          handleCardDragStart,
          handleCardDragEnd,
          handleColumnDragStart,
          handleColumnDrop,
          handleCardDrop,
        }),
        [
          columns,
          readOnly,
          allowColumnReorder,
          allowCardReorder,
          allowCardMoveBetweenColumns,
          dragState,
          activeCard,
          activeColumn,
          handleCardDragStart,
          handleCardDragEnd,
          handleColumnDragStart,
          handleColumnDrop,
          handleCardDrop,
        ]
      );

      // Render default card
      const renderDefaultCard = React.useCallback(
        (card: KanbanCard, column: KanbanColumn) => {
          const isDragging = dragState.draggingCard?.id === card.id;
          const isOver = dragState.targetColumn?.id === column.id;
          const timeSinceActivity = getTimeSinceLastActivity(card);

          return (
            <div
              key={card.id}
              className={getCardClasses(
                card.priority,
                isDragging,
                isOver,
                activeCard?.id === card.id,
                card.isArchived,
                card.className
              )}
              draggable={!readOnly && allowCardReorder}
              onDragStart={(e) => handleCardDragStart(card, column, e)}
              onDragEnd={handleCardDragEnd}
              onDragOver={(e) => {
                if (allowCardMoveBetweenColumns) {
                  e.preventDefault();
                  setDragState((prev: KanbanDragState) => ({ ...prev, targetColumn: column }));
                }
              }}
              onDragLeave={() => {
                if (allowCardMoveBetweenColumns) {
                  setDragState((prev: KanbanDragState) => ({ ...prev, targetColumn: undefined }));
                }
              }}
              onDrop={(e) => {
                if (allowCardMoveBetweenColumns) {
                  e.preventDefault();
                  handleCardDrop(column, undefined, e);
                }
              }}
              onClick={(e) => handleCardClick(card, column, e)}
              style={card.style}
              role="button"
              tabIndex={0}
              aria-label={`Card: ${card.title}. Priority: ${card.priority}. Due: ${card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date'}`}
              data-testid={`kanban-card-${card.id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(card, column, e as any);
                }
              }}
            >
              {/* Card Header */}
              <div className={kanbanClasses.card.header}>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                  {card.title}
                </h4>
                {showCardActions && !readOnly && (
                  <button
                    className={cn(kanbanClasses.action.base, kanbanClasses.action.delete)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card, column);
                    }}
                    aria-label={`Delete card: ${card.title}`}
                    data-testid={`${testId}-delete-card-${card.id}`}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Card Body */}
              {card.description && (
                <div className={kanbanClasses.card.body}>{card.description}</div>
              )}

              {/* CRM Metadata */}
              <div className="space-y-2 mt-2">
                {/* Value + Probability */}
                {showCardValue && card.value !== undefined && (
                  <div className="flex items-center justify-between">
                    <span
                      data-testid={`${testId}-card-value-${card.id}`}
                      className="font-semibold text-success-600 dark:text-success-400"
                    >
                      {card.currency || '$'}
                      {card.value.toLocaleString()}
                    </span>

                    {/* Probability Display */}
                    {showProbability && card.probability !== undefined && (
                      <>
                        <span
                          data-testid={`${testId}-card-probability-inline-${card.id}`}
                          className="text-sm font-medium text-gray-600 dark:text-gray-400"
                        >
                          {card.probability}%
                        </span>
                        <span
                          data-testid={`${testId}-card-probability-badge-${card.id}`}
                          className={cn(
                            'px-2 py-0.5 text-xs font-semibold rounded-full',
                            getProbabilityBadgeClass(card.probability)
                          )}
                        >
                          {card.probability}%
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Story Points / Hours */}
                {(card.storyPoints || card.estimatedHours || card.actualHours) && (
                  <div className="flex items-center gap-2">
                    {card.storyPoints && (
                      <span
                        data-testid={`${testId}-card-sp-${card.id}`}
                        className="flex items-center gap-1"
                      >
                        <span className="font-medium">SP:</span>
                        {card.storyPoints}
                      </span>
                    )}
                    {card.estimatedHours && (
                      <span
                        data-testid={`${testId}-card-est-${card.id}`}
                        className="flex items-center gap-1"
                      >
                        <span className="font-medium">Est:</span>
                        {card.estimatedHours}h
                      </span>
                    )}
                    {card.actualHours && (
                      <span
                        data-testid={`${testId}-card-act-${card.id}`}
                        className="flex items-center gap-1"
                      >
                        <span className="font-medium">Act:</span>
                        {card.actualHours}h
                      </span>
                    )}
                  </div>
                )}

                {/* Due Date (ONLY here) */}
                {card.dueDate && (
                  <span
                    data-testid={`${testId}-card-due-${card.id}`}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {typeof card.dueDate === 'string' && !isNaN(new Date(card.dueDate).getTime())
                      ? new Date(card.dueDate).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : card.dueDate instanceof Date
                        ? card.dueDate.toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : String(card.dueDate)}
                  </span>
                )}

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div className={kanbanClasses.card.tags}>
                    {card.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className={kanbanClasses.card.tag}>
                        {tag}
                      </span>
                    ))}
                    {card.tags.length > 3 && (
                      <span className={kanbanClasses.card.tag}>+{card.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className={kanbanClasses.card.footer}>
                {/* Activity and Counts */}
                <div className="flex items-center gap-2">
                  {card.lastActivityAt && (
                    <span className="text-xs" title={timeSinceActivity}>
                      {timeSinceActivity}
                    </span>
                  )}
                  {(card.attachmentsCount || card.commentsCount) && (
                    <div className="flex items-center gap-1">
                      {card.attachmentsCount && (
                        <span className="text-xs">📎{card.attachmentsCount}</span>
                      )}
                      {card.commentsCount && (
                        <span className="text-xs">💬{card.commentsCount}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        },
        [
          dragState,
          activeCard,
          readOnly,
          allowCardReorder,
          allowCardMoveBetweenColumns,
          handleCardDragStart,
          handleCardDragEnd,
          handleCardDrop,
          handleCardClick,
          handleDeleteCard,
          showCardValue,
          showProbability,
          testId,
    showCardActions,
        ]
      );

// Top-level stable callback for adding a card
const handleAddCardForColumn = React.useCallback(
  (column: KanbanColumn) => {
    if (readOnly) return;

    const newCard = createKanbanCard();
    const updatedColumns = columns.map((col) =>
      col.id === column.id ? { ...col, cards: [...col.cards, newCard] } : col
    );

    setColumns(updatedColumns);
    onChange?.(updatedColumns, newCard, undefined, column);
    onAddCard?.(column);
  },
  [readOnly, columns, onChange, onAddCard] // ✅ onAddCard is now included
);

// Render default column
// Update the renderDefaultColumn function (around line 754)
const renderDefaultColumn = React.useCallback(
  (column: KanbanColumn, index: number) => {
    const isDragging =
      dragState.sourceColumn?.id === column.id && dragState.type === 'column';
    const isOver = dragState.targetColumn?.id === column.id;
    const wipClass = getWipLimitClass(column.cards.length, column.wipLimit);
    const columnValue = column.cards.reduce((total, card) => total + (card.value || 0), 0);
    const columnWeightedValue = column.cards.reduce(
      (total, card) => total + calculateWeightedValue(card),
      0
    );

    return (
      <div
        key={column.id}
        className={getColumnClasses(
          column.color,
          isDragging,
          isOver,
          column.isCollapsed,
          column.className
        )}
        draggable={!readOnly && allowColumnReorder}
        onDragStart={(e) => handleColumnDragStart(column, e)}
        onDragOver={(e) => {
          if (allowColumnReorder) e.preventDefault();
        }}
        onDrop={(e) => handleColumnDrop(index, e)}
        onClick={(e) => handleColumnClick(column, e)}
        style={{ minWidth: minColumnWidth, ...column.style }}
        role={onColumnClick ? 'button' : 'region'}
        tabIndex={onColumnClick ? 0 : undefined}
        aria-label={`Column: ${column.title}. ${column.cards.length} cards. ${column.description || ''}`}
        data-testid={`${testId}-column-${column.id}`}
      >
        {/* Column Header */}
        <div className={kanbanClasses.column.header}>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{column.title}</h3>
            {column.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{column.description}</p>
            )}
          </div>

          {/* Column Stats */}
          <div className="flex items-center gap-2">
            {showCardCounts && (
              <span
                className={kanbanClasses.column.count}
                data-testid={`${testId}-card-count-${column.id}`}
              >
                {column.cards.length}
                {column.maxCards && `/${column.maxCards}`}
              </span>
            )}

            {showWipLimits && column.wipLimit && (
              <span className={wipClass}>
                {column.cards.length}/{column.wipLimit}
              </span>
            )}

            {showColumnActions && !readOnly && (
              <button
                className={cn(kanbanClasses.action.base, kanbanClasses.action.delete)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteColumn(column);
                }}
                aria-label={`Delete column: ${column.title}`}
                data-testid={`${testId}-delete-column-${column.id}`}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Column Body */}
        {!column.isCollapsed && (
          <div className={kanbanClasses.column.body}>
            {column.cards.map((card) =>
              renderCard ? renderCard(card, column) : renderDefaultCard(card, column)
            )}

            {!readOnly && onAddCard && (
              <button
                className={cn(
                  'w-full p-3 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
                  kanbanClasses.accessibility.focus
                )}
                onClick={() => handleAddCardForColumn(column)}
                aria-label={`Add card to ${column.title}`}
                data-testid={`${testId}-add-card-${column.id}`}
              >
                <span className="text-gray-500 dark:text-gray-400">+ Add Card</span>
              </button>
            )}

            {/* Drag Drop Placeholder */}
            {dragState.type === 'card' && dragState.targetColumn?.id === column.id && (
              <div className={kanbanClasses.drag.placeholder} />
            )}
          </div>
        )}

        {/* Column Footer */}
        {!column.isCollapsed && (renderColumnFooter || showCardValue) && (
          <div className={kanbanClasses.column.footer}>
            {renderColumnFooter
              ? renderColumnFooter(column)
              : showCardValue &&
                columnValue > 0 && (
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Value: {column.currency || '$'}
                    {columnValue.toLocaleString()}
                    {columnWeightedValue !== columnValue && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        (Weighted: {column.currency || '$'}
                        {columnWeightedValue.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
          </div>
        )}
      </div>
    );
  },
  [
    dragState,
    readOnly,
    allowColumnReorder,
    minColumnWidth,
    onColumnClick,
    handleColumnDragStart,
    handleColumnDrop,
    handleColumnClick,
    handleDeleteColumn,
    showCardCounts,
    showWipLimits,
    showCardValue,
    showColumnActions,
    renderCard,
    renderDefaultCard,
    renderColumnFooter,
    testId,
    handleAddCardForColumn,
    onAddCard, // ✅ Add this missing dependency
  ]
);

      const calculateEnhancedAnalytics = React.useCallback((): KanbanAnalytics => {
        //   const totalCards = columns.reduce((total, col) => total + col.cards.length, 0);
        const totalValue = calculatePipelineValue();
        const weightedValue = calculateWeightedPipelineValue();

        // Calculate average deal size (excluding $0 deals)
        const dealsWithValue = columns.flatMap((col) =>
          col.cards.filter((card: KanbanCard) => (card.value || 0) > 0)
        );
        const averageDealSize =
          dealsWithValue.length > 0
            ? dealsWithValue.reduce((sum, card) => sum + (card.value || 0), 0) /
              dealsWithValue.length
            : 0;

        // Calculate days in pipeline (simplified - based on createdAt)
        const cardsWithDates = columns.flatMap((col) =>
          col.cards.filter((card: KanbanCard) => card.createdAt)
        );
        let averageDaysInPipeline = 0;
        if (cardsWithDates.length > 0) {
          const now = new Date();
          const totalDays = cardsWithDates.reduce((sum, card) => {
            const createdAt =
              card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt || now);
            if (isNaN(createdAt.getTime())) return sum;
            const diffDays = Math.floor(
              (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + Math.max(0, diffDays);
          }, 0);
          averageDaysInPipeline = Math.floor(totalDays / cardsWithDates.length);
        }

        // Win rate (simplified - would need actual win/loss data)
        const wonDeals = columns.flatMap((col) =>
          col.cards.filter((card: KanbanCard) => card.status === 'done' || card.probability === 100)
        );
        const winRate =
          dealsWithValue.length > 0
            ? Math.round((wonDeals.length / dealsWithValue.length) * 100)
            : 0;

       return {
    totalValue,
    weightedValue,
    averageDealSize,
    winRate,
    averageDaysInPipeline,
  };
}, [columns, calculatePipelineValue, calculateWeightedPipelineValue]);

      // Render analytics
      const renderDefaultAnalytics = React.useCallback(() => {
        const analyticsData = calculateEnhancedAnalytics();

        return (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Pipeline Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {columns.reduce((total, col) => total + col.cards.length, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Cards</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {columns.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Stages</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                  ${analyticsData.totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pipeline Value</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-2xl font-bold text-info-600 dark:text-info-400">
                  ${analyticsData.weightedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Weighted Value</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analyticsData.winRate}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 grid grid-cols-3 gap-4">
              <div>Avg Deal: ${analyticsData.averageDealSize.toLocaleString()}</div>
              <div>Avg Days: {analyticsData.averageDaysInPipeline}</div>
              <div>
                Active Deals:{' '}
                {
                  columns
                    .flatMap((col) => col.cards)
                    .filter((card) => card.probability && card.probability > 0).length
                }
              </div>
            </div>
          </div>
        );
      }, [columns, calculateEnhancedAnalytics]);

      // Empty state
      if (columns.length === 0 && !loading && !error) {
        return (
          <div
            ref={ref}
            className={cn(
              'flex items-center justify-center h-64 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700',
              className
            )}
            style={style}
            data-testid={testId}
            data-analytics={analyticsId}
            data-cy={cyId}
            {...props}
          >
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{emptyMessage}</p>
              {!readOnly && onAddColumn && (
                <button
                  className={cn(
                    'px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors duration-150',
                    kanbanClasses.accessibility.focus
                  )}
                  onClick={handleAddColumn}
                  aria-label="Add first column"
                  data-testid={`${testId}-add-first-column`}
                >
                  + Add Column
                </button>
              )}
            </div>
          </div>
        );
      }

      // Error state
      if (error) {
        return (
          <div
            ref={ref}
            className={cn(kanbanClasses.error, className)}
            style={style}
            data-testid={testId}
            data-analytics={analyticsId}
            data-cy={cyId}
            {...props}
          >
            {error}
          </div>
        );
      }

      // Main render
      return (
        <KanbanContext.Provider value={contextValue}>
          {props.children} {/* <-- this is the key fix */}
          <div
            ref={ref}
            className={cn(
              getKanbanClasses(loading, error, className),
              kanbanClasses.accessibility.focus
            )}
            style={{
              maxHeight,
              ...style,
            }}
            role="region"
            aria-label="Kanban board"
            tabIndex={0}
            data-testid={testId}
            data-analytics={analyticsId}
            data-cy={cyId}
            {...props}
          >
            {/* Analytics Section */}
            {showAnalytics &&
              (renderAnalytics
                ? renderAnalytics(
                    analytics || {
                      totalValue: calculatePipelineValue(),
                      weightedValue: calculateWeightedPipelineValue(),
                      averageDealSize: 0,
                      winRate: 0,
                      averageDaysInPipeline: 0,
                    }
                  )
                : renderDefaultAnalytics())}

            {/* Kanban Board */}
            <div className="flex gap-4 pb-4">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  data-testid={`kanban-column-${column.id}`} // Add this line
                  onClick={(event) => onColumnClick && onColumnClick(column, event)} // Add this line
                >
                  {renderColumnHeader
                    ? renderColumnHeader(column)
                    : renderDefaultColumn(column, index)}
                </div>
              ))}

              {/* Add Column Button */}
              {!readOnly && onAddColumn && (
                <button
                  className={cn(
                    'flex-shrink-0 w-72 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200',
                    kanbanClasses.accessibility.focus
                  )}
                  onClick={handleAddColumn}
                  aria-label="Add new column"
                  data-testid={`${testId}-add-column`}
                >
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-2xl mb-1">+</div>
                    <div className="font-medium">Add Column</div>
                  </div>
                </button>
              )}
            </div>

            {/* Drag Ghost Element */}
            {dragState.draggingCard && dragState.position && (
              <div
                className={cn(
                  kanbanClasses.drag.ghost,
                  getCardClasses(dragState.draggingCard.priority)
                )}
                style={{
                  left: dragState.position.x - 100,
                  top: dragState.position.y - 50,
                  width: '200px',
                }}
                aria-label={getDragAriaLabel('card', dragState.draggingCard, 'dragging')}
              >
                <div className="p-3">
                  <div className="font-medium truncate">{dragState.draggingCard.title}</div>
                  {dragState.draggingCard.description && (
                    <div className="text-sm text-gray-600 truncate mt-1">
                      {dragState.draggingCard.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </KanbanContext.Provider>
      );
    }
  )
);

Kanban.displayName = 'Kanban';

/**
 * Custom hook to use Kanban context
 */
export function useKanban() {
  const context = React.useContext(KanbanContext);
  if (!context) {
    throw new Error('useKanban must be used within a Kanban component');
  }
  return context;
}

/**
 * KanbanColumn sub-component for compound pattern
 */
export const KanbanColumnComponent = React.memo(
  React.forwardRef<HTMLDivElement, KanbanColumnProps>(
    ({ column, index, isDragging, isOver, className, style, ...props }, ref) => {
      const { readOnly, allowColumnReorder, handleColumnDragStart, handleColumnDrop } = useKanban();

      return (
        <div
          ref={ref}
          className={getColumnClasses(
            column.color,
            isDragging,
            isOver,
            column.isCollapsed,
            className
          )}
          draggable={!readOnly && (allowColumnReorder || false)}
          onDragStart={(e) => handleColumnDragStart?.(column, e)}
          onDragOver={(e) => {
            if (allowColumnReorder) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => handleColumnDrop?.(index, e)}
          style={{
            minWidth: kanbanTokens.column.minWidth,
            ...style,
          }}
          {...props}
        />
      );
    }
  )
);

KanbanColumnComponent.displayName = 'Kanban.Column';

/**
 * KanbanCard sub-component for compound pattern
 */
export const KanbanCardComponent = React.memo(
  React.forwardRef<HTMLDivElement, KanbanCardProps>(
    ({ card, column, isDragging, isOver, className, style, ...props }, ref) => {
      const { readOnly, allowCardReorder, handleCardDragStart, handleCardDragEnd } = useKanban();

      return (
        <div
          ref={ref}
          className={getCardClasses(
            card.priority,
            isDragging,
            isOver,
            false,
            card.isArchived,
            className
          )}
          draggable={!readOnly && (allowCardReorder || false)}
          onDragStart={(e) => handleCardDragStart?.(card, column, e)}
          onDragEnd={handleCardDragEnd}
          style={style}
          {...props}
        />
      );
    }
  )
);

KanbanCardComponent.displayName = 'Kanban.Card';
