// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\index.ts
// Barrel exports for Kanban component

// Re-export components
export { Kanban, KanbanColumnComponent, KanbanCardComponent, useKanban } from './Kanban';

// Re-export types
export type {
  KanbanProps,
  KanbanRef,
  KanbanCard,
  KanbanColumn,
  KanbanSource,
  KanbanStage,
  KanbanAnalytics,
  KanbanDragState,
  KanbanContextValue,
  KanbanColumnProps,
  KanbanCardProps,
  KanbanColor,
  KanbanPriority,
  KanbanStatus,
} from './Kanban.types';

// Re-export type utilities and functions
export {
  createKanbanCard,
  createKanbanColumn,
  calculateWeightedValue,
  getProbabilityColor,
  getTimeSinceLastActivity,
  getKanbanColorClass,
  getPriorityColor,
  isKanbanCard,
  isKanbanColumn,
} from './Kanban.types';

// Re-export style utilities
export {
  kanbanTokens,
  kanbanClasses,
  getKanbanClasses,
  getColumnClasses,
  getCardClasses,
  getDueDateClass,
  getWipLimitClass,
  getDragAriaLabel,
  defaultKanbanStyleProps,
} from './Kanban.styles';

// Re-export stories for documentation
export {
  Default as KanbanStoryDefault,
  ReadOnly as KanbanStoryReadOnly,
  WithAnalytics as KanbanStoryWithAnalytics,
  Empty as KanbanStoryEmpty,
  WithWipLimits as KanbanStoryWithWipLimits,
  Loading as KanbanStoryLoading,
  Error as KanbanStoryError,
  CRMPipeline as KanbanStoryCRMPipeline,
  EdgeCases as KanbanStoryEdgeCases,
  Accessibility as KanbanStoryAccessibility,
  PropToggles as KanbanStoryPropToggles,
  Performance as KanbanStoryPerformance,
  CustomCardRendering as KanbanStoryCustomCardRendering,
  CustomColumnHeaders as KanbanStoryCustomColumnHeaders,
  CompoundComponents as KanbanStoryCompoundComponents,
  Interactive as KanbanStoryInteractive,
  DarkMode as KanbanStoryDarkMode,
  Playground as KanbanStoryPlayground,
} from './Kanban.stories';
