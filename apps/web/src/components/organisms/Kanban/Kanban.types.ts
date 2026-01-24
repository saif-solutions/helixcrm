// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\Kanban.types.ts
import * as React from 'react';

/**
 * Kanban Card Item - Represents a card in a Kanban column
 */
export interface KanbanCard {
  /** Unique identifier for the card */
  id: string;
  /** Card title/heading */
  title: string;
  /** Card description/content */
  description?: string;
  /** Card status/priority */
  status?: 'todo' | 'in-progress' | 'review' | 'done' | string;
  /** Priority level */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Assigned user ID or name */
  assignedTo?: string;
  /** Due date */
  dueDate?: Date | string;
  /** CRM-SPECIFIC: Story points or estimation (for agile workflows) */
  storyPoints?: number;
  /** CRM-SPECIFIC: Estimated hours for completion */
  estimatedHours?: number;
  /** CRM-SPECIFIC: Actual hours spent */
  actualHours?: number;
  /** CRM-SPECIFIC: Associated account ID */
  accountId?: string;
  /** CRM-SPECIFIC: Associated contact ID */
  contactId?: string;
  /** CRM-SPECIFIC: Opportunity/revenue value */
  value?: number;
  /** CRM-SPECIFIC: Currency code for value */
  currency?: string;
  /** CRM-SPECIFIC: Number of attachments */
  attachmentsCount?: number;
  /** CRM-SPECIFIC: Number of comments */
  commentsCount?: number;
  /** CRM-SPECIFIC: Last activity timestamp */
  lastActivityAt?: Date | string;
  /** CRM-SPECIFIC: Source of the card (email, web, manual, etc.) */
  source?: 'email' | 'web' | 'phone' | 'manual' | 'import' | 'integration';
  /** CRM-SPECIFIC: Pipeline stage probability (0-100) */
  probability?: number;
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Card tags/labels */
  tags?: string[];
  /** Whether card is archived */
  isArchived?: boolean;
  /** Created timestamp */
  createdAt?: Date | string;
  /** Updated timestamp */
  updatedAt?: Date | string;
  /** Custom CSS class */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

export type KanbanSource =
  | 'email'
  | 'web'
  | 'phone'
  | 'manual'
  | 'import'
  | 'integration'
  | 'referral';
export type KanbanStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

// Add this new interface for CRM pipeline analytics
export interface KanbanAnalytics {
  /** Total value in pipeline */
  totalValue: number;
  /** Weighted pipeline value (value × probability) */
  weightedValue: number;
  /** Average deal size */
  averageDealSize: number;
  /** Win rate percentage */
  winRate: number;
  /** Average days in pipeline */
  averageDaysInPipeline: number;
}

// Add this to KanbanProps for CRM analytics
export interface KanbanProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Columns to display */
  columns: KanbanColumn[];
  /** Whether Kanban is read-only */
  readOnly?: boolean;
  /** Whether to show column actions */
  showColumnActions?: boolean;
  /** Whether to show card actions */
  showCardActions?: boolean;
  /** Whether to allow column reordering */
  allowColumnReorder?: boolean;
  /** Whether to allow card reordering within columns */
  allowCardReorder?: boolean;
  /** Whether to allow moving cards between columns */
  allowCardMoveBetweenColumns?: boolean;
  /** Whether to show empty columns */
  showEmptyColumns?: boolean;
  /** Maximum height of the Kanban board */
  maxHeight?: string | number;
  /** Minimum column width */
  minColumnWidth?: string | number;
  /** CRM-SPECIFIC: Show pipeline analytics */
  showAnalytics?: boolean;
  /** CRM-SPECIFIC: Analytics data */
  analytics?: KanbanAnalytics;
  /** CRM-SPECIFIC: Show value amounts on cards */
  showCardValue?: boolean;
  /** CRM-SPECIFIC: Show probability indicators */
  showProbability?: boolean;
  /** Callback when cards are reordered or moved */
  onChange?: (
    columns: KanbanColumn[],
    movedCard?: KanbanCard,
    sourceColumn?: KanbanColumn,
    targetColumn?: KanbanColumn
  ) => void;
  /** Callback when a card is clicked */
  onCardClick?: (card: KanbanCard, column: KanbanColumn, event: React.MouseEvent) => void;
  /** Callback when a column is clicked */
  onColumnClick?: (column: KanbanColumn, event: React.MouseEvent) => void;
  /** Callback when add card is clicked */
  onAddCard?: (column: KanbanColumn) => void;
  /** Callback when add column is clicked */
  onAddColumn?: () => void;
  /** Callback when delete card is clicked */
  onDeleteCard?: (card: KanbanCard, column: KanbanColumn) => void;
  /** Callback when delete column is clicked */
  onDeleteColumn?: (column: KanbanColumn) => void;
  /** CRM-SPECIFIC: Callback when card value changes */
  onCardValueChange?: (card: KanbanCard, newValue: number) => void;
  /** CRM-SPECIFIC: Callback when probability changes */
  onProbabilityChange?: (card: KanbanCard, newProbability: number) => void;
  /** Custom render function for cards */
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  /** Custom render function for column header */
  renderColumnHeader?: (column: KanbanColumn) => React.ReactNode;
  /** Custom render function for column footer */
  renderColumnFooter?: (column: KanbanColumn) => React.ReactNode;
  /** CRM-SPECIFIC: Custom render function for analytics */
  renderAnalytics?: (analytics: KanbanAnalytics) => React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether to show card counts */
  showCardCounts?: boolean;
  /** Whether to show WIP limits */
  showWipLimits?: boolean;
  /** Data attribute for testing */
  'data-testid'?: string;
  /** Data attribute for analytics */
  'data-analytics'?: string;
  /** Data attribute for Cypress testing */
  'data-cy'?: string;
}

// Add new utility functions for CRM features
/**
 * Calculate weighted value (value × probability)
 */
export function calculateWeightedValue(card: KanbanCard): number {
  const value = card.value || 0;
  const probability = card.probability || 0;
  return value * (probability / 100);
}

/**
 * Get probability color (for visual indicators)
 */
export function getProbabilityColor(probability?: number): KanbanColor {
  if (!probability) return 'gray';
  if (probability >= 80) return 'success';
  if (probability >= 50) return 'warning';
  return 'error';
}

/**
 * Get time since last activity
 */
export function getTimeSinceLastActivity(card: KanbanCard): string {
  if (!card.lastActivityAt) return 'No activity';

  const lastActivity =
    card.lastActivityAt instanceof Date ? card.lastActivityAt : new Date(card.lastActivityAt);

  if (isNaN(lastActivity.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Kanban Column - Represents a column in the Kanban board
 */
// In Kanban.types.ts, add to KanbanColumn interface:
export interface KanbanColumn {
  /** Unique identifier for the column */
  id: string;
  /** Column title */
  title: string;
  /** Column description */
  description?: string;
  /** Cards in this column */
  cards: KanbanCard[];
  /** Maximum number of cards allowed (optional) */
  maxCards?: number;
  /** Column color/theme */
  color?: KanbanColor;
  /** Whether column is collapsed */
  isCollapsed?: boolean;
  /** WIP (Work In Progress) limit */
  wipLimit?: number;
  /** CRM-SPECIFIC: Currency for column value calculations */
  currency?: string;
  /** Custom CSS class */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Main Kanban component props
 */
export interface KanbanProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Columns to display */
  columns: KanbanColumn[];
  /** Whether Kanban is read-only */
  readOnly?: boolean;
  /** Whether to show column actions */
  showColumnActions?: boolean;
  /** Whether to show card actions */
  showCardActions?: boolean;
  /** Whether to allow column reordering */
  allowColumnReorder?: boolean;
  /** Whether to allow card reordering within columns */
  allowCardReorder?: boolean;
  /** Whether to allow moving cards between columns */
  allowCardMoveBetweenColumns?: boolean;
  /** Whether to show empty columns */
  showEmptyColumns?: boolean;
  /** Maximum height of the Kanban board */
  maxHeight?: string | number;
  /** Minimum column width */
  minColumnWidth?: string | number;
  /** Callback when cards are reordered or moved */
  onChange?: (
    columns: KanbanColumn[],
    movedCard?: KanbanCard,
    sourceColumn?: KanbanColumn,
    targetColumn?: KanbanColumn
  ) => void;
  /** Callback when a card is clicked */
  onCardClick?: (card: KanbanCard, column: KanbanColumn, event: React.MouseEvent) => void;
  /** Callback when a column is clicked */
  onColumnClick?: (column: KanbanColumn, event: React.MouseEvent) => void;
  /** Callback when add card is clicked */
  onAddCard?: (column: KanbanColumn) => void;
  /** Callback when add column is clicked */
  onAddColumn?: () => void;
  /** Callback when delete card is clicked */
  onDeleteCard?: (card: KanbanCard, column: KanbanColumn) => void;
  /** Callback when delete column is clicked */
  onDeleteColumn?: (column: KanbanColumn) => void;
  /** Custom render function for cards */
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  /** Custom render function for column header */
  renderColumnHeader?: (column: KanbanColumn) => React.ReactNode;
  /** Custom render function for column footer */
  renderColumnFooter?: (column: KanbanColumn) => React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether to show card counts */
  showCardCounts?: boolean;
  /** Whether to show WIP limits */
  showWipLimits?: boolean;
  /** Data attribute for testing */
  'data-testid'?: string;
  /** Data attribute for analytics */
  'data-analytics'?: string;
  /** Data attribute for Cypress testing */
  'data-cy'?: string;
}

/**
 * Kanban ref type
 */
export type KanbanRef = HTMLDivElement;

/**
 * Drag and drop state
 */
export interface KanbanDragState {
  /** Currently dragging card */
  draggingCard?: KanbanCard;
  /** Source column */
  sourceColumn?: KanbanColumn;
  /** Target column */
  targetColumn?: KanbanColumn;
  /** Drag type */
  type: 'card' | 'column' | 'none';
  /** Drag position */
  position?: { x: number; y: number };
}

/**
 * Kanban context for compound components
 */
// Update KanbanContextValue interface:
export interface KanbanContextValue {
  /** Current columns */
  columns: KanbanColumn[];
  /** Update columns */
  setColumns: (columns: KanbanColumn[]) => void;
  /** Read-only mode */
  readOnly: boolean;
  /** Allow column reordering */
  allowColumnReorder?: boolean;
  /** Allow card reordering */
  allowCardReorder?: boolean;
  /** Allow card moving between columns */
  allowCardMoveBetweenColumns?: boolean;
  /** Drag state */
  dragState: KanbanDragState;
  /** Set drag state */
  setDragState: (state: KanbanDragState) => void;
  /** Active card (for editing) */
  activeCard?: KanbanCard;
  /** Set active card */
  setActiveCard: (card?: KanbanCard) => void;
  /** Active column (for editing) */
  activeColumn?: KanbanColumn;
  /** Set active column */
  setActiveColumn: (column?: KanbanColumn) => void;
  /** CRM-SPECIFIC: Drag handlers for compound components */
  handleCardDragStart?: (card: KanbanCard, column: KanbanColumn, event: React.DragEvent) => void;
  handleCardDragEnd?: (event: React.DragEvent) => void;
  handleColumnDragStart?: (column: KanbanColumn, event: React.DragEvent) => void;
  handleColumnDrop?: (targetIndex: number, event: React.DragEvent) => void;
  handleCardDrop?: (column: KanbanColumn, targetIndex?: number, event?: React.DragEvent) => void;
}

/**
 * Sub-components props
 */
export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  column: KanbanColumn;
  index: number;
  isDragging?: boolean;
  isOver?: boolean;
}

export interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: KanbanCard;
  column: KanbanColumn;
  index: number;
  isDragging?: boolean;
  isOver?: boolean;
}

/**
 * Utility types
 */
export type KanbanColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'gray';
export type KanbanPriority = 'low' | 'medium' | 'high' | 'critical';
export type KanbanStatus = 'todo' | 'in-progress' | 'review' | 'done';

/**
 * Utility functions
 */

/**
 * Get color class for Kanban column
 */
export function getKanbanColorClass(color?: KanbanColor): string {
  const colorClasses: Record<KanbanColor, string> = {
    primary: 'bg-primary-50 border-primary-200 text-primary-800',
    secondary: 'bg-secondary-50 border-secondary-200 text-secondary-800',
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-info-50 border-info-200 text-info-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  return color ? colorClasses[color] : colorClasses.gray;
}

/**
 * Get priority color
 */
export function getPriorityColor(priority?: KanbanPriority): KanbanColor {
  const priorityColors: Record<KanbanPriority, KanbanColor> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };

  return priority ? priorityColors[priority] : 'gray';
}

/**
 * Type guard to check if item is KanbanCard
 */
export function isKanbanCard(item: any): item is KanbanCard {
  return item && typeof item === 'object' && 'id' in item && 'title' in item;
}

/**
 * Type guard to check if item is KanbanColumn
 */
export function isKanbanColumn(item: any): item is KanbanColumn {
  return item && typeof item === 'object' && 'id' in item && 'title' in item && 'cards' in item;
}

/**
 * Create a new Kanban card
 */
export function createKanbanCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'New Card',
    description: '',
    status: 'todo',
    priority: 'medium',
    storyPoints: 1,
    estimatedHours: 0,
    actualHours: 0,
    value: 0,
    probability: 10, // Default 10% for new leads
    source: 'manual',
    attachmentsCount: 0,
    commentsCount: 0,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a new Kanban column
 */
export function createKanbanColumn(overrides: Partial<KanbanColumn> = {}): KanbanColumn {
  return {
    id: `column-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'New Column',
    cards: [],
    ...overrides,
  };
}
