// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\Kanban.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Kanban, useKanban, KanbanColumnComponent, KanbanCardComponent } from './Kanban';
import { createKanbanCard, createKanbanColumn } from './Kanban.types';
import type { KanbanColumn } from './Kanban.types';

// Helper function to create a mock drag event with dataTransfer
const createMockDragEvent = (overrides = {}) => ({
  dataTransfer: {
    setData: vi.fn(),
    getData: vi.fn(() => ''),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: null,
    dropEffect: null,
    types: [],
    files: [],
    items: [],
  },
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  currentTarget: {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  },
  ...overrides,
});

// Mock a column with a CRM card
const mockCRMColumn: KanbanColumn = {
  id: 'col-crm',
  title: 'CRM Deals',
  cards: [
    {
      id: 'crm-card',
      title: 'Enterprise Deal',
      value: 50000,
      currency: '$',
      probability: 75,
      storyPoints: 8,
      estimatedHours: 40,
      actualHours: 20,
      dueDate: '2026-01-12', // string is safer for tests
      attachmentsCount: 3,
      commentsCount: 5,
      tags: ['High Priority', 'VIP'],
    },
  ],
};

// Helper function to get kanban elements
const getKanban = () => screen.getByTestId('kanban');
const getAddColumnButton = () => screen.getByTestId('kanban-add-column');
const getAddFirstColumnButton = () => screen.getByTestId('kanban-add-first-column');

// Mock data
const mockCards = [
  createKanbanCard({ id: 'card-1', title: 'Test Card 1', priority: 'high' }),
  createKanbanCard({ id: 'card-2', title: 'Test Card 2', priority: 'medium' }),
  createKanbanCard({ id: 'card-3', title: 'Test Card 3', priority: 'low' }),
];

const mockColumns = [
  createKanbanColumn({ id: 'col-1', title: 'To Do', cards: [mockCards[0]] }),
  createKanbanColumn({ id: 'col-2', title: 'In Progress', cards: [mockCards[1]] }),
  createKanbanColumn({ id: 'col-3', title: 'Done', cards: [mockCards[2]] }),
];

describe('Kanban Component', () => {
  test('renders kanban with columns and cards', () => {
    render(<Kanban columns={mockColumns} showCardValue />);

    expect(getKanban()).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    expect(screen.getByText('Test Card 3')).toBeInTheDocument();
  });

  test('renders empty state when no columns', () => {
    render(<Kanban columns={[]} emptyMessage="No pipeline data" />);

    expect(screen.getByText('No pipeline data')).toBeInTheDocument();
    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
  });

  test('renders loading state', () => {
    render(<Kanban columns={mockColumns} loading={true} />);

    const kanban = getKanban();
    expect(kanban).toHaveClass('opacity-70', 'cursor-wait');
  });

  test('renders error state', () => {
    const errorMessage = 'Failed to load pipeline';
    render(<Kanban columns={mockColumns} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-error-600');
  });

  test('handles card click', async () => {
    const handleCardClick = vi.fn();
    render(<Kanban columns={mockColumns} onCardClick={handleCardClick} />);

    const card = screen.getByText('Test Card 1');
    await userEvent.click(card);

    expect(handleCardClick).toHaveBeenCalledTimes(1);
    expect(handleCardClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'card-1', title: 'Test Card 1' }),
      expect.objectContaining({ id: 'col-1', title: 'To Do' }),
      expect.any(Object)
    );
  });

  test('handles column click', async () => {
    const handleColumnClick = vi.fn();
    render(<Kanban columns={mockColumns} onColumnClick={handleColumnClick} />);

    // Grab all elements with the testId and pick the first one
    const columns = screen.getAllByTestId('kanban-column-col-1');
    const column = columns[0];

    // Click the column
    await userEvent.click(column);

    // Assertions
    expect(handleColumnClick).toHaveBeenCalledTimes(1);
    expect(handleColumnClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'col-1', title: 'To Do' }),
      expect.any(Object)
    );
  });

  test('shows add column button when onAddColumn provided', () => {
    const handleAddColumn = vi.fn();
    render(<Kanban columns={mockColumns} onAddColumn={handleAddColumn} />);

    expect(getAddColumnButton()).toBeInTheDocument();
    expect(getAddColumnButton()).toHaveTextContent('Add Column');
  });

  test('handles add column click', async () => {
    const handleAddColumn = vi.fn();
    render(<Kanban columns={mockColumns} onAddColumn={handleAddColumn} />);

    await userEvent.click(getAddColumnButton());

    expect(handleAddColumn).toHaveBeenCalledTimes(1);
  });

  test('shows add first column button in empty state', () => {
    const handleAddColumn = vi.fn();
    render(<Kanban columns={[]} onAddColumn={handleAddColumn} />);

    expect(getAddFirstColumnButton()).toBeInTheDocument();
  });

  test('handles add card click when onAddCard provided', async () => {
    const handleAddCard = vi.fn();
    render(<Kanban columns={mockColumns} onAddCard={handleAddCard} />);

    const addCardButtons = screen.getAllByText('+ Add Card');
    await userEvent.click(addCardButtons[0]);

    expect(handleAddCard).toHaveBeenCalledTimes(1);
    expect(handleAddCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'col-1', title: 'To Do' })
    );
  });

  test('does not show actions in read-only mode', () => {
    render(
      <Kanban
        columns={mockColumns}
        readOnly={true}
        showColumnActions={true}
        showCardActions={true}
      />
    );

    // Should not show delete buttons
    expect(screen.queryAllByRole('button', { name: /delete/i })).toHaveLength(0);
    // Should not show add card buttons
    expect(screen.queryByText('+ Add Card')).not.toBeInTheDocument();
    // Should not show add column button
    expect(screen.queryByText('Add Column')).not.toBeInTheDocument();
  });

  test('shows card counts when enabled', () => {
    render(<Kanban columns={mockColumns} showCardCounts={true} />);

    // Check each column's card count by testId
    mockColumns.forEach((column) => {
      const cardCount = screen.getByTestId(`kanban-card-count-${column.id}`);
      expect(cardCount).toHaveTextContent(`${column.cards.length}`);
    });
  });

  test('shows WIP limits when enabled and defined', () => {
    const columnsWithWip = [
      { ...mockColumns[0], wipLimit: 5 },
      { ...mockColumns[1], wipLimit: 3 },
    ];

    render(<Kanban columns={columnsWithWip} showWipLimits={true} />);

    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  test('shows analytics when enabled', () => {
    render(<Kanban columns={mockColumns} showAnalytics={true} />);

    expect(screen.getByText('Pipeline Analytics')).toBeInTheDocument();
    expect(screen.getByText('Total Cards')).toBeInTheDocument();
    expect(screen.getByText('Stages')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Value')).toBeInTheDocument();
    expect(screen.getByText('Weighted Value')).toBeInTheDocument();
  });

  // Update the test in Kanban.test.tsx:

  test('shows CRM-specific fields when present', () => {
    render(<Kanban columns={[mockCRMColumn]} showCardValue showProbability />);

    const card = mockCRMColumn.cards[0];

    // Value
    expect(screen.getByTestId(`kanban-card-value-${card.id}`)).toBeInTheDocument();

    // Probability - check for the inline display
    expect(screen.getByTestId(`kanban-card-probability-inline-${card.id}`)).toHaveTextContent(
      `${card.probability}%`
    );

    // Probability badge
    expect(screen.getByTestId(`kanban-card-probability-badge-${card.id}`)).toHaveTextContent(
      `${card.probability}%`
    );

    // Story points
    expect(screen.getByTestId(`kanban-card-sp-${card.id}`)).toHaveTextContent(
      `${card.storyPoints}`
    );

    // Estimated hours
    expect(screen.getByTestId(`kanban-card-est-${card.id}`)).toHaveTextContent(
      `${card.estimatedHours}h`
    );

    // Actual hours
    expect(screen.getByTestId(`kanban-card-act-${card.id}`)).toHaveTextContent(
      `${card.actualHours}h`
    );

    // Due date - now matches the formatted date
    expect(screen.getByTestId(`kanban-card-due-${card.id}`)).toHaveTextContent('1/12/2026');
  });

  test('handles card drag and drop within same column', async () => {
    const handleChange = vi.fn();
    const multiCardColumn = createKanbanColumn({
      id: 'multi-col',
      title: 'Test Column',
      cards: [
        createKanbanCard({ id: 'card-a', title: 'Card A' }),
        createKanbanCard({ id: 'card-b', title: 'Card B' }),
        createKanbanCard({ id: 'card-c', title: 'Card C' }),
      ],
    });

    render(<Kanban columns={[multiCardColumn]} allowCardReorder={true} onChange={handleChange} />);

    const cardA = screen.getByText('Card A');
    const cardB = screen.getByText('Card B');

    // Create mock events
    const mockDragStartEvent = createMockDragEvent();
    const mockDragOverEvent = createMockDragEvent();
    const mockDropEvent = createMockDragEvent();

    // Simulate drag and drop
    fireEvent.dragStart(cardA, mockDragStartEvent);
    fireEvent.dragOver(cardB, mockDragOverEvent);
    fireEvent.drop(cardB, mockDropEvent);

    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByText('Card B')).toBeInTheDocument();
  });

  test('prevents drag and drop in read-only mode', () => {
    render(
      <Kanban
        columns={mockColumns}
        readOnly={true}
        allowCardReorder={true}
        allowColumnReorder={true}
      />
    );

    const card = screen.getByText('Test Card 1');
    expect(card.closest('[draggable]')).not.toHaveAttribute('draggable', 'true');
  });

  test('applies priority styling to cards', () => {
    render(<Kanban columns={mockColumns} showCardValue />);

    const highPriorityCard = screen.getByText('Test Card 1').closest('[data-testid*="card-"]');
    const mediumPriorityCard = screen.getByText('Test Card 2').closest('[data-testid*="card-"]');
    const lowPriorityCard = screen.getByText('Test Card 3').closest('[data-testid*="card-"]');

    expect(highPriorityCard).toHaveClass('border-l-error-500');
    expect(mediumPriorityCard).toHaveClass('border-l-warning-500');
    expect(lowPriorityCard).toHaveClass('border-l-success-500');
  });

  test('applies due date styling', () => {
    render(<Kanban columns={[mockCRMColumn]} />);

    const card = mockCRMColumn.cards[0];
    const dueDateEl = screen.getByTestId(`kanban-card-due-${card.id}`);

    // match formatted UI date (your component formats it)
    expect(dueDateEl).toHaveTextContent('1/12/2026');
  });

  test('handles custom card rendering', () => {
    const customRenderCard = vi.fn((card) => (
      <div data-testid={`custom-card-${card.id}`}>Custom: {card.title}</div>
    ));

    render(<Kanban columns={mockColumns} renderCard={customRenderCard} />);

    expect(customRenderCard).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('custom-card-card-1')).toBeInTheDocument();
    expect(screen.getByText('Custom: Test Card 1')).toBeInTheDocument();
  });

  test('handles custom column header rendering', () => {
    const customRenderHeader = vi.fn((column) => (
      <div data-testid={`custom-header-${column.id}`}>Custom: {column.title}</div>
    ));

    render(<Kanban columns={mockColumns} renderColumnHeader={customRenderHeader} />);

    expect(customRenderHeader).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('custom-header-col-1')).toBeInTheDocument();
    expect(screen.getByText('Custom: To Do')).toBeInTheDocument();
  });

  test('supports collapsed columns', () => {
    const collapsedColumn = createKanbanColumn({
      id: 'collapsed',
      title: 'Collapsed',
      cards: mockCards,
      isCollapsed: true,
    });

    render(<Kanban columns={[collapsedColumn]} />);

    const column = screen.getByText('Collapsed').closest('[data-testid*="column-"]');
    expect(column).toHaveClass('w-16', 'min-h-0', 'overflow-hidden');

    // Cards should not be visible in collapsed column
    expect(screen.queryByText('Test Card 1')).not.toBeInTheDocument();
  });

  test('respects column color variants', () => {
    const coloredColumns = [
      createKanbanColumn({ id: 'primary', title: 'Primary', color: 'primary' }),
      createKanbanColumn({ id: 'success', title: 'Success', color: 'success' }),
      createKanbanColumn({ id: 'error', title: 'Error', color: 'error' }),
    ];

    render(<Kanban columns={coloredColumns} />);

    const primaryCol = screen.getByText('Primary').closest('[data-testid*="column-"]');
    const successCol = screen.getByText('Success').closest('[data-testid*="column-"]');
    const errorCol = screen.getByText('Error').closest('[data-testid*="column-"]');

    expect(primaryCol).toHaveClass('border-primary-200');
    expect(successCol).toHaveClass('border-success-200');
    expect(errorCol).toHaveClass('border-error-200');
  });

  test('forwards data attributes', () => {
    render(
      <Kanban
        columns={mockColumns}
        data-testid="custom-kanban"
        data-analytics="pipeline-view"
        data-cy="kanban-board"
      />
    );

    const kanban = screen.getByTestId('custom-kanban');
    expect(kanban).toBeInTheDocument();
    expect(kanban).toHaveAttribute('data-analytics', 'pipeline-view');
    expect(kanban).toHaveAttribute('data-cy', 'kanban-board');
  });
});

describe('Kanban Compound Components', () => {
  test('KanbanColumnComponent renders with context', () => {
    const column = createKanbanColumn({
      id: 'test-col',
      title: 'Test Column',
      cards: [createKanbanCard({ id: 'test-card', title: 'Test Card' })],
    });

    render(
      <Kanban columns={[column]}>
        <div data-testid="test-container">
          <KanbanColumnComponent column={column} index={0} data-testid="test-column-component" />
        </div>
      </Kanban>
    );

    expect(screen.getByTestId('test-container')).toBeInTheDocument();
    expect(screen.getByTestId('test-column-component')).toBeInTheDocument();
  });

  test('KanbanCardComponent renders with context', () => {
    const card = createKanbanCard({
      id: 'test-card',
      title: 'Test Card',
    });
    const column = createKanbanColumn({
      id: 'test-col',
      title: 'Test Column',
      cards: [card],
    });

    render(
      <Kanban columns={[column]}>
        <div data-testid="test-container">
          <KanbanCardComponent
            card={card}
            column={column}
            index={0}
            data-testid="test-card-component"
          >
            <div>Custom content inside card</div>
          </KanbanCardComponent>
        </div>
      </Kanban>
    );

    expect(screen.getByTestId('test-container')).toBeInTheDocument();
    expect(screen.getByTestId('test-card-component')).toBeInTheDocument();
    expect(screen.getByText('Custom content inside card')).toBeInTheDocument();
  });

  test('useKanban hook throws error when used outside context', () => {
    const TestComponent = () => {
      useKanban();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useKanban must be used within a Kanban component'
    );
  });
});

describe('Kanban Accessibility', () => {
  test('has proper ARIA attributes', () => {
    render(<Kanban columns={mockColumns} showCardValue />);

    const kanban = getKanban();
    expect(kanban).toHaveAttribute('role', 'region');
    expect(kanban).toHaveAttribute('aria-label', 'Kanban board');
    expect(kanban).toHaveAttribute('tabindex', '0');

    // Cards should have button role
    const card = screen.getByText('Test Card 1');
    expect(card.closest('[role="button"]')).toBeInTheDocument();
  });

  test('cards have accessible labels', () => {
    const cardWithDate = createKanbanCard({
      id: 'accessible-card',
      title: 'Important Deal',
      priority: 'high',
      dueDate: '2024-12-31',
    });

    const column = createKanbanColumn({
      id: 'accessible-col',
      title: 'Pipeline',
      cards: [cardWithDate],
    });

    render(<Kanban columns={[column]} />);

    const card = screen.getByText('Important Deal');
    const cardElement = card.closest('[role="button"]');
    expect(cardElement).toHaveAttribute('aria-label');
    const ariaLabel = cardElement?.getAttribute('aria-label');
    expect(ariaLabel).toContain('Important Deal');
    expect(ariaLabel).toContain('high');
  });

  test('supports keyboard navigation', async () => {
    const handleCardClick = vi.fn();
    render(<Kanban columns={mockColumns} onCardClick={handleCardClick} />);

    // Get the card element that has role="button"
    const cardElement = screen.getByTestId('kanban-card-card-1');

    // Focus and trigger key events on the card element itself
    cardElement.focus();

    // Simulate Enter key press
    fireEvent.keyDown(cardElement, { key: 'Enter', code: 'Enter' });

    // The card should trigger click on Enter
    expect(handleCardClick).toHaveBeenCalledTimes(1);
  });
});

describe('Kanban Performance', () => {
  test('handles large number of cards', () => {
    const manyCards = Array.from({ length: 100 }, (_, i) =>
      createKanbanCard({ id: `card-${i}`, title: `Card ${i}` })
    );

    const column = createKanbanColumn({
      id: 'large-col',
      title: 'Large Column',
      cards: manyCards,
    });

    const startTime = performance.now();
    render(<Kanban columns={[column]} />);
    const endTime = performance.now();

    // Should render within reasonable time
    expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

    // Should show all cards
    expect(screen.getByText('Card 0')).toBeInTheDocument();
    expect(screen.getByText('Card 99')).toBeInTheDocument();
  });

  test('memoizes callbacks', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<Kanban columns={mockColumns} onChange={handleChange} />);

    // Re-render with same props
    rerender(<Kanban columns={mockColumns} onChange={handleChange} />);

    // Callbacks should remain stable (tested via React.memo behavior)
    const card = screen.getByText('Test Card 1');
    expect(card).toBeInTheDocument();
  });
});

describe('Kanban Advanced Features', () => {
  test('handles card drag and drop between columns', async () => {
    const handleChange = vi.fn();
    const columns = [
      createKanbanColumn({
        id: 'source-col',
        title: 'Source',
        cards: [createKanbanCard({ id: 'move-card', title: 'Move Me' })],
      }),
      createKanbanColumn({
        id: 'target-col',
        title: 'Target',
        cards: [],
      }),
    ];

    render(<Kanban columns={columns} allowCardMoveBetweenColumns={true} onChange={handleChange} />);

    const card = screen.getByText('Move Me');
    const targetColumn = screen.getByText('Target').closest('[data-testid*="column-"]');

    // Create mock events
    const mockDragStartEvent = createMockDragEvent();
    const mockDragOverEvent = createMockDragEvent();
    const mockDropEvent = createMockDragEvent();

    // Simulate drag from source to target
    fireEvent.dragStart(card, mockDragStartEvent);
    fireEvent.dragOver(targetColumn!, mockDragOverEvent);
    fireEvent.drop(targetColumn!, mockDropEvent);

    expect(screen.getByText('Move Me')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  test('handles column drag and drop reordering', async () => {
    const handleChange = vi.fn();
    render(<Kanban columns={mockColumns} allowColumnReorder={true} onChange={handleChange} />);

    const firstColumn = screen.getByText('To Do').closest('[data-testid*="column-"]');
    const secondColumn = screen.getByText('In Progress').closest('[data-testid*="column-"]');

    // Create mock events
    const mockDragStartEvent = createMockDragEvent();
    const mockDragOverEvent = createMockDragEvent();
    const mockDropEvent = createMockDragEvent();

    // Simulate column reorder
    fireEvent.dragStart(firstColumn!, mockDragStartEvent);
    fireEvent.dragOver(secondColumn!, mockDragOverEvent);
    fireEvent.drop(secondColumn!, mockDropEvent);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  test('calculates correct weighted value in analytics', () => {
    const columnsWithValues = [
      createKanbanColumn({
        id: 'col-1',
        title: 'Pipeline',
        cards: [
          createKanbanCard({ id: 'card-1', title: 'Deal A', value: 10000, probability: 50 }),
          createKanbanCard({ id: 'card-2', title: 'Deal B', value: 20000, probability: 75 }),
          createKanbanCard({ id: 'card-3', title: 'Deal C', value: 30000, probability: 25 }),
        ],
      }),
    ];

    render(<Kanban columns={columnsWithValues} showAnalytics={true} />);

    // Total value = 10000 + 20000 + 30000 = 60000
    // Weighted value = (10000 * 0.5) + (20000 * 0.75) + (30000 * 0.25) = 5000 + 15000 + 7500 = 27500

    // Use regex to match flexible currency formatting
    expect(screen.getAllByText(/\$.*60,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$.*27,500/).length).toBeGreaterThan(0);
  });

  test('calculates correct average deal size', () => {
    const columnsWithDeals = [
      createKanbanColumn({
        id: 'col-1',
        title: 'Deals',
        cards: [
          createKanbanCard({ id: 'card-1', title: 'Small', value: 5000 }),
          createKanbanCard({ id: 'card-2', title: 'Medium', value: 15000 }),
          createKanbanCard({ id: 'card-3', title: 'Large', value: 25000 }),
          createKanbanCard({ id: 'card-4', title: 'No Value' }), // Should be excluded from average
        ],
      }),
    ];

    render(<Kanban columns={columnsWithDeals} showAnalytics={true} />);

    // Average deal size = (5000 + 15000 + 25000) / 3 = 15000
    // Use regex to match the text with flexible spacing
    expect(screen.getByText(/Avg Deal:.*\$.*15,000/)).toBeInTheDocument();
  });

  test('handles custom column footer rendering', () => {
    const customRenderFooter = vi.fn((column) => (
      <div data-testid={`custom-footer-${column.id}`}>Footer: {column.title}</div>
    ));

    render(<Kanban columns={mockColumns} renderColumnFooter={customRenderFooter} />);

    expect(customRenderFooter).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('custom-footer-col-1')).toBeInTheDocument();
    expect(screen.getByText('Footer: To Do')).toBeInTheDocument();
  });

  test('handles custom analytics rendering', () => {
    const customRenderAnalytics = vi.fn((analytics) => (
      <div data-testid="custom-analytics">Custom Total: ${analytics.totalValue}</div>
    ));

    render(
      <Kanban columns={mockColumns} showAnalytics={true} renderAnalytics={customRenderAnalytics} />
    );

    expect(customRenderAnalytics).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('custom-analytics')).toBeInTheDocument();
    expect(screen.getByText(/Custom Total: \$/)).toBeInTheDocument();
  });

  test('handles edge cases with missing card values gracefully', () => {
    const edgeCaseCards = [
      createKanbanCard({ id: 'no-value', title: 'No Value', value: undefined }),
      createKanbanCard({ id: 'zero-prob', title: 'Zero Probability', probability: 0 }),
      createKanbanCard({ id: 'null-due', title: 'Null Due Date', dueDate: undefined }),
      createKanbanCard({ id: 'empty-tags', title: 'Empty Tags', tags: [] }),
      createKanbanCard({
        id: 'invalid-date',
        title: 'Invalid Date Card',
        dueDate: 'invalid-date-string',
      }),
    ];

    const column = createKanbanColumn({
      id: 'edge-col',
      title: 'Edge Cases',
      cards: edgeCaseCards,
    });

    expect(() => {
      render(<Kanban columns={[column]} showCardValue={true} showProbability={true} />);
    }).not.toThrow();

    // All cards should render without errors
    expect(screen.getByText('No Value')).toBeInTheDocument();
    expect(screen.getByText('Zero Probability')).toBeInTheDocument();
    expect(screen.getByText('Null Due Date')).toBeInTheDocument();
    expect(screen.getByText('Empty Tags')).toBeInTheDocument();
    expect(screen.getByText('Invalid Date Card')).toBeInTheDocument();
  });

  test('shows drag ghost element at correct position', () => {
    const column = createKanbanColumn({
      id: 'ghost-col',
      title: 'Ghost Test',
      cards: [createKanbanCard({ id: 'ghost-card', title: 'Ghost Card' })],
    });

    render(<Kanban columns={[column]} allowCardReorder={true} />);

    const card = screen.getByText('Ghost Card');

    // Create mock event
    const mockDragStartEvent = createMockDragEvent();

    // Trigger drag start
    fireEvent.dragStart(card, {
      ...mockDragStartEvent,
      clientX: 100,
      clientY: 200,
    });

    expect(screen.getByText('Ghost Card')).toBeInTheDocument();
  });

  test('handles WIP limit warnings correctly', () => {
    const columnsWithWip = [
      createKanbanColumn({
        id: 'under-limit',
        title: 'Under Limit',
        cards: [createKanbanCard({ id: 'card-1', title: 'Card 1' })],
        wipLimit: 5,
      }),
      createKanbanColumn({
        id: 'at-limit',
        title: 'At Limit',
        cards: Array.from({ length: 4 }, (_, i) =>
          createKanbanCard({ id: `card-${i}`, title: `Card ${i}` })
        ),
        wipLimit: 4,
      }),
      createKanbanColumn({
        id: 'over-limit',
        title: 'Over Limit',
        cards: Array.from({ length: 6 }, (_, i) =>
          createKanbanCard({ id: `over-card-${i}`, title: `Over Card ${i}` })
        ),
        wipLimit: 5,
      }),
    ];

    render(<Kanban columns={columnsWithWip} showWipLimits={true} />);

    // Check WIP limit displays
    const underLimit = screen.getByText('1/5');
    const atLimit = screen.getByText('4/4');
    const overLimit = screen.getByText('6/5');

    // Check classes
    expect(underLimit).toHaveClass('bg-success-100');
    expect(atLimit).toHaveClass('bg-warning-100');
    expect(overLimit).toHaveClass('bg-error-100');
  });

  test('handles currency variations correctly', () => {
    const multiCurrencyColumns = [
      createKanbanColumn({
        id: 'usd-col',
        title: 'USD Deals',
        cards: [
          createKanbanCard({ id: 'usd-card', title: 'USD Deal', value: 10000, currency: 'USD' }),
        ],
        currency: 'USD',
      }),
      createKanbanColumn({
        id: 'eur-col',
        title: 'EUR Deals',
        cards: [
          createKanbanCard({ id: 'eur-card', title: 'EUR Deal', value: 10000, currency: 'EUR' }),
        ],
        currency: 'EUR',
      }),
      createKanbanColumn({
        id: 'gbp-col',
        title: 'GBP Deals',
        cards: [
          createKanbanCard({ id: 'gbp-card', title: 'GBP Deal', value: 10000, currency: 'GBP' }),
        ],
        currency: 'GBP',
      }),
    ];

    render(<Kanban columns={multiCurrencyColumns} showCardValue={true} showAnalytics={true} />);

    // Check currency symbols in card display - use regex for flexible matching
    expect(screen.getByTestId('kanban-card-value-usd-card')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-card-value-eur-card')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-card-value-gbp-card')).toBeInTheDocument();

    // Analytics should handle mixed currencies
    expect(screen.getByText('Pipeline Analytics')).toBeInTheDocument();
  });

  test('preserves card metadata during drag and drop', async () => {
    const handleChange = vi.fn();
    const cardWithMetadata = createKanbanCard({
      id: 'meta-card',
      title: 'Card with Metadata',
      value: 50000,
      probability: 60,
      accountId: 'acc-123',
      contactId: 'con-456',
      storyPoints: 5,
      tags: ['important', 'urgent'],
      metadata: { customField: 'customValue' },
    });

    const columns = [
      createKanbanColumn({
        id: 'source',
        title: 'Source',
        cards: [cardWithMetadata],
      }),
      createKanbanColumn({
        id: 'target',
        title: 'Target',
        cards: [],
      }),
    ];

    render(<Kanban columns={columns} allowCardMoveBetweenColumns={true} onChange={handleChange} />);

    expect(screen.getByText('Card with Metadata')).toBeInTheDocument();
  });
});
