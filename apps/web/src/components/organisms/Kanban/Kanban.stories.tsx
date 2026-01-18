// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\Kanban\Kanban.stories.tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Kanban, useKanban, KanbanColumnComponent, KanbanCardComponent } from './Kanban';
import { createKanbanCard, createKanbanColumn, KanbanAnalytics } from './Kanban.types';

/**
 * Calculate analytics from columns data
 */
function calculateAnalyticsFromColumns(columns: any[]): KanbanAnalytics {
  const allCards = columns.flatMap((col: any) => col.cards);
  const cardsWithValue = allCards.filter((card: any) => (card.value || 0) > 0);
  const cardsWithDates = allCards.filter((card: any) => card.createdAt);
  
  const totalValue = allCards.reduce((sum: number, card: any) => sum + (card.value || 0), 0);
  const weightedValue = allCards.reduce((sum: number, card: any) => {
    const probability = card.probability || 0;
    return sum + (card.value || 0) * (probability / 100);
  }, 0);
  
  const averageDealSize = cardsWithValue.length > 0 
    ? cardsWithValue.reduce((sum: number, card: any) => sum + (card.value || 0), 0) / cardsWithValue.length
    : 0;
  
  // Calculate days in pipeline (simplified)
  const now = new Date();
  const totalDays = cardsWithDates.reduce((sum: number, card: any) => {
    const createdAt = card.createdAt instanceof Date 
      ? card.createdAt 
      : new Date(card.createdAt || now);
    if (isNaN(createdAt.getTime())) return sum;
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return sum + Math.max(0, diffDays);
  }, 0);
  
  const averageDaysInPipeline = cardsWithDates.length > 0 
    ? Math.floor(totalDays / cardsWithDates.length) 
    : 0;
  
  // Win rate calculation (simplified - would need actual won/lost data)
  const wonDeals = allCards.filter((card: any) => card.status === 'done' || card.probability === 100);
  const winRate = cardsWithValue.length > 0 
    ? Math.round((wonDeals.length / cardsWithValue.length) * 100)
    : 0;
  
  return {
    totalValue,
    weightedValue,
    averageDealSize,
    winRate,
    averageDaysInPipeline,
  };
}

const meta: Meta<typeof Kanban> = {
  title: 'Organisms/Kanban',
  component: Kanban,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Enterprise Kanban board for CRM pipeline visualization with drag & drop, analytics, and CRM-specific features.',
      },
    },
  },
  argTypes: {
    readOnly: {
      control: 'boolean',
      description: 'Prevents user interactions (drag, add, delete)',
    },
    showColumnActions: {
      control: 'boolean',
      description: 'Show column action buttons (add, delete)',
    },
    showCardActions: {
      control: 'boolean',
      description: 'Show card action buttons',
    },
    allowColumnReorder: {
      control: 'boolean',
      description: 'Allow dragging columns to reorder',
    },
    allowCardReorder: {
      control: 'boolean',
      description: 'Allow dragging cards within columns',
    },
    allowCardMoveBetweenColumns: {
      control: 'boolean',
      description: 'Allow moving cards between columns',
    },
    showAnalytics: {
      control: 'boolean',
      description: 'Show pipeline analytics dashboard',
    },
    showCardValue: {
      control: 'boolean',
      description: 'Show deal value on cards',
    },
    showProbability: {
      control: 'boolean',
      description: 'Show probability indicators',
    },
    showCardCounts: {
      control: 'boolean',
      description: 'Show card counts in column headers',
    },
    showWipLimits: {
      control: 'boolean',
      description: 'Show WIP (Work In Progress) limits',
    },
    maxHeight: {
      control: 'text',
      description: 'Maximum height of the Kanban board',
    },
    minColumnWidth: {
      control: 'text',
      description: 'Minimum column width',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Kanban>;

export default meta;
type Story = StoryObj<typeof Kanban>;

// Sample CRM data
const sampleCRMColumns = [
  createKanbanColumn({
    id: 'lead',
    title: 'Leads',
    description: 'New potential customers',
    color: 'primary',
    cards: [
      createKanbanCard({
        title: 'Acme Corporation',
        description: 'Enterprise software deal',
        value: 75000,
        probability: 20,
        priority: 'high',
        assignedTo: 'John Doe',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        storyPoints: 5,
        estimatedHours: 40,
        source: 'web',
        accountId: 'acc-001',
        tags: ['enterprise', 'software'],
        attachmentsCount: 3,
        commentsCount: 5,
      }),
      createKanbanCard({
        title: 'Beta Solutions',
        description: 'Consulting services',
        value: 25000,
        probability: 15,
        priority: 'medium',
        assignedTo: 'Jane Smith',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        source: 'email',
        tags: ['consulting'],
      }),
    ],
  }),
  createKanbanColumn({
    id: 'qualified',
    title: 'Qualified',
    description: 'Evaluating needs',
    color: 'info',
    wipLimit: 5,
    cards: [
      createKanbanCard({
        title: 'Gamma Tech',
        description: 'Hardware procurement',
        value: 120000,
        probability: 40,
        priority: 'critical',
        assignedTo: 'Mike Johnson',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        storyPoints: 8,
        estimatedHours: 60,
        source: 'phone',
        accountId: 'acc-002',
        tags: ['hardware', 'procurement'],
        attachmentsCount: 8,
        commentsCount: 12,
      }),
    ],
  }),
  createKanbanColumn({
    id: 'proposal',
    title: 'Proposal',
    description: 'Proposal sent',
    color: 'warning',
    cards: [
      createKanbanCard({
        title: 'Delta Industries',
        description: 'Annual maintenance contract',
        value: 45000,
        probability: 60,
        priority: 'medium',
        assignedTo: 'Sarah Wilson',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        source: 'manual',
        tags: ['maintenance', 'annual'],
      }),
      createKanbanCard({
        title: 'Epsilon Services',
        description: 'Training package',
        value: 18000,
        probability: 55,
        priority: 'low',
        assignedTo: 'Robert Chen',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday (overdue)
        source: 'web',
        tags: ['training'],
      }),
    ],
  }),
  createKanbanColumn({
    id: 'negotiation',
    title: 'Negotiation',
    description: 'Finalizing terms',
    color: 'warning',
    wipLimit: 3,
    cards: [
      createKanbanCard({
        title: 'Zeta Manufacturing',
        description: 'Custom software development',
        value: 200000,
        probability: 80,
        priority: 'high',
        assignedTo: 'John Doe',
        dueDate: new Date(),
        storyPoints: 13,
        estimatedHours: 120,
        source: 'manual',
        accountId: 'acc-003',
        tags: ['custom', 'development'],
        attachmentsCount: 15,
        commentsCount: 25,
      }),
    ],
  }),
  createKanbanColumn({
    id: 'closed-won',
    title: 'Closed Won',
    description: 'Successfully closed deals',
    color: 'success',
    cards: [
      createKanbanCard({
        title: 'Omega Retail',
        description: 'Point of sale system',
        value: 85000,
        probability: 100,
        priority: 'medium',
        assignedTo: 'Jane Smith',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        source: 'web',
        tags: ['retail', 'pos'],
        attachmentsCount: 5,
        commentsCount: 8,
      }),
    ],
  }),
];

// Create a lightweight version for performance
const lightweightColumns = sampleCRMColumns.map(column => ({
  ...column,
  cards: column.cards.slice(0, 2), // Limit to 2 cards per column for performance
}));

// Sample analytics data
const sampleAnalytics: KanbanAnalytics = calculateAnalyticsFromColumns(lightweightColumns);

// Add edge case columns
const edgeCaseColumns = [
  createKanbanColumn({
    id: 'edge-cases',
    title: 'Edge Cases',
    color: 'gray',
    cards: [
      createKanbanCard({
        title: 'No Value',
        description: 'Card with no monetary value',
        value: undefined,
        probability: undefined,
      }),
      createKanbanCard({
        title: 'Zero Probability',
        description: 'Deal with 0% chance',
        value: 10000,
        probability: 0,
      }),
      createKanbanCard({
        title: 'Invalid Date',
        description: 'Card with invalid due date',
        dueDate: 'invalid-date-string',
      }),
      createKanbanCard({
        title: 'No Tags',
        description: 'Card with empty tags array',
        tags: [],
      }),
      createKanbanCard({
        title: 'Very Long Title That Should Be Truncated in the Display Because It Exceeds the Maximum Width',
        description: 'This is a very long description that should also be truncated to avoid breaking the card layout and maintain visual consistency across the board.',
        value: 999999,
        probability: 99,
        tags: ['very-long-tag-name-that-also-needs-truncation', 'another-tag'],
      }),
    ],
  }),
];

/**
 * Default Kanban Story
 */
export const Default: Story = {
  args: {
    columns: lightweightColumns,
    'data-testid': 'kanban-default',
  },
};

/**
 * Read-only Kanban (for view-only access)
 */
export const ReadOnly: Story = {
  args: {
    columns: lightweightColumns,
    readOnly: true,
    showColumnActions: false,
    showCardActions: false,
    'data-testid': 'kanban-readonly',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban board in read-only mode. Users cannot drag, add, or delete cards/columns.',
      },
    },
  },
};

/**
 * Kanban with Analytics Dashboard
 */
export const WithAnalytics: Story = {
  args: {
    columns: lightweightColumns,
    showAnalytics: true,
    analytics: sampleAnalytics,
    showCardValue: true,
    showProbability: true,
    'data-testid': 'kanban-analytics',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban with dynamically calculated pipeline analytics showing total value, weighted pipeline, win rates, and other CRM metrics.',
      },
    },
  },
};

/**
 * Empty Kanban Board
 */
export const Empty: Story = {
  args: {
    columns: [],
    emptyMessage: 'No pipeline data available. Add your first column to get started!',
    'data-testid': 'kanban-empty',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty Kanban board with call-to-action to add first column.',
      },
    },
  },
};

/**
 * Kanban with WIP Limits
 */
export const WithWipLimits: Story = {
  args: {
    columns: lightweightColumns.map(col => ({
      ...col,
      wipLimit: col.cards.length + 2, // Set WIP limit slightly above current count
    })),
    showWipLimits: true,
    showCardCounts: true,
    'data-testid': 'kanban-wip',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban with Work In Progress (WIP) limits to visualize capacity constraints.',
      },
    },
  },
};

/**
 * Loading State
 */
export const Loading: Story = {
  args: {
    columns: [],
    loading: true,
    'data-testid': 'kanban-loading',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban in loading state with visual indicators.',
      },
    },
  },
};

/**
 * Error State
 */
export const Error: Story = {
  args: {
    columns: [],
    error: 'Failed to load pipeline data. Please try again later.',
    'data-testid': 'kanban-error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban in error state with error message display.',
      },
    },
  },
};

/**
 * CRM Pipeline Example
 */
export const CRMPipeline: Story = {
  args: {
    columns: lightweightColumns,
    showAnalytics: true,
    showCardValue: true,
    showProbability: true,
    showCardCounts: true,
    showWipLimits: true,
    allowCardMoveBetweenColumns: true,
    allowCardReorder: true,
    allowColumnReorder: true,
    'data-testid': 'kanban-crm-pipeline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete CRM pipeline example with all enterprise features: deal tracking, probability, value, analytics, and drag & drop.',
      },
    },
  },
};

/**
 * Edge Cases
 */
export const EdgeCases: Story = {
  args: {
    columns: edgeCaseColumns,
    showCardValue: true,
    showProbability: true,
    'data-testid': 'kanban-edge-cases',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban board showing how edge cases are handled: missing values, invalid dates, long text truncation, and empty arrays.',
      },
    },
  },
};

/**
 * Accessibility Example
 */
export const Accessibility: Story = {
  args: {
    columns: lightweightColumns,
    'data-testid': 'kanban-accessibility',
  },
  render: (args) => {
    const [instructions, setInstructions] = React.useState('');
    
    const handleKeyDown = (event: React.KeyboardEvent) => {
      switch(event.key) {
        case 'ArrowLeft':
          setInstructions('Focus moved left');
          break;
        case 'ArrowRight':
          setInstructions('Focus moved right');
          break;
        case 'Enter':
        case ' ':
          setInstructions('Card selected');
          break;
        case 'Escape':
          setInstructions('Focus cleared');
          break;
      }
    };
    
    return (
      <div>
        <div style={{
          padding: '16px',
          marginBottom: '16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>Accessibility Demo</h3>
          <p style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>
            Try keyboard navigation: Tab to focus cards, Arrow keys to navigate, Enter/Space to select, Escape to clear.
          </p>
          <div style={{ 
            padding: '8px', 
            backgroundColor: 'white', 
            borderRadius: '4px',
            minHeight: '24px',
            fontFamily: 'monospace',
          }}>
            {instructions || 'Keyboard actions will appear here...'}
          </div>
        </div>
        <Kanban 
          {...args}
          onCardClick={(card) => {
            setInstructions(`Card clicked: ${card.title}`);
          }}
          onKeyDown={handleKeyDown}
        />
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#fefce8',
          border: '1px solid #fde047',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#713f12' }}>Accessibility Features</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#713f12' }}>
            <li>All cards have proper ARIA labels with title, priority, and due date</li>
            <li>Keyboard navigation with Tab, Arrow keys, Enter, and Space</li>
            <li>Focus indicators visible for keyboard users</li>
            <li>Screen reader announcements for drag & drop</li>
            <li>Proper heading hierarchy</li>
            <li>Sufficient color contrast for all states</li>
          </ul>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Accessibility-focused Kanban demonstrating keyboard navigation, screen reader support, and proper ARIA attributes.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'heading-order',
            enabled: true,
          },
          {
            id: 'aria-required-attr',
            enabled: true,
          },
        ],
      },
    },
  },
};

/**
 * Prop Toggles Demo
 */
export const PropToggles: Story = {
  args: {
    columns: lightweightColumns,
    showCardValue: false,
    showProbability: false,
    showCardCounts: false,
    showWipLimits: false,
    'data-testid': 'kanban-prop-toggles',
  },
  render: (args) => {
    const [props, setProps] = React.useState(args);
    
    const toggleProp = (propName: keyof typeof args) => {
      setProps(prev => ({ ...prev, [propName]: !(prev as any)[propName] }));
    };
    
    return (
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <Kanban {...props} />
        </div>
        
        <div style={{
          width: '300px',
          padding: '20px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          height: 'fit-content',
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Prop Controls</h3>
          
          {[
            { label: 'Show Card Value ($)', prop: 'showCardValue' },
            { label: 'Show Probability (%)', prop: 'showProbability' },
            { label: 'Show Card Counts', prop: 'showCardCounts' },
            { label: 'Show WIP Limits', prop: 'showWipLimits' },
            { label: 'Allow Drag & Drop', prop: 'allowCardReorder' },
            { label: 'Show Column Actions', prop: 'showColumnActions' },
            { label: 'Show Card Actions', prop: 'showCardActions' },
            { label: 'Show Analytics', prop: 'showAnalytics' },
          ].map(({ label, prop }) => (
            <div 
              key={prop} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: (props as any)[prop] ? '#dbeafe' : 'transparent',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
              }}
            >
              <span style={{ color: '#334155' }}>{label}</span>
              <button
                onClick={() => toggleProp(prop as keyof typeof args)}
                style={{
                  backgroundColor: (props as any)[prop] ? '#3b82f6' : '#94a3b8',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  minWidth: '60px',
                }}
              >
                {(props as any)[prop] ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
          
          <div style={{ 
            marginTop: '20px', 
            padding: '12px', 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #86efac',
            borderRadius: '6px',
          }}>
            <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>
              Visual Feedback
            </div>
            <div style={{ fontSize: '11px', color: '#166534' }}>
              Card borders highlight when props affect them. Try toggling options to see immediate visual changes.
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing how each boolean prop affects the Kanban appearance and behavior. Toggle controls to see visual feedback.',
      },
    },
  },
};

/**
 * Performance Optimized
 */
export const Performance: Story = {
  args: {
    columns: lightweightColumns,
    'data-testid': 'kanban-performance',
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance-optimized Kanban with limited cards for Storybook performance. Uses React.memo and optimized rendering.',
      },
    },
    performance: {
      disable: false,
    },
  },
};

/**
 * Custom Card Rendering Example
 */
export const CustomCardRendering: Story = {
  args: {
    columns: lightweightColumns,
    renderCard: (card, column) => (
      <div 
        style={{
          padding: '12px',
          margin: '8px 0',
          backgroundColor: '#f8fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
        onClick={() => alert(`Clicked: ${card.title} in ${column.title}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#1e293b' }}>{card.title}</h4>
          {card.value && (
            <span style={{ 
              backgroundColor: '#10b981', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              ${card.value.toLocaleString()}
            </span>
          )}
        </div>
        {card.description && (
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            {card.description}
          </p>
        )}
        {card.tags && card.tags.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {card.tags.map(tag => (
              <span 
                key={tag}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    ),
    'data-testid': 'kanban-custom-cards',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban with custom card rendering using renderCard prop for complete control over card appearance.',
      },
    },
  },
};

/**
 * Custom Column Header Example
 */
export const CustomColumnHeaders: Story = {
  args: {
    columns: lightweightColumns,
    renderColumnHeader: (column) => (
      <div style={{
        padding: '12px',
        backgroundColor: '#3b82f6',
        color: 'white',
        borderBottom: '2px solid #1d4ed8',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{column.title}</h3>
          {column.description && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              {column.description}
            </p>
          )}
        </div>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '2px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          {column.cards.length} cards
        </div>
      </div>
    ),
    'data-testid': 'kanban-custom-headers',
  },
  parameters: {
    docs: {
      description: {
        story: 'Kanban with custom column headers using renderColumnHeader prop.',
      },
    },
  },
};

/**
 * Compound Components Example
 */
export const CompoundComponents: Story = {
  render: () => {
    // Example of using compound components pattern
    const CustomKanban = () => {
      const { columns, setColumns } = useKanban();
      
      const handleAddCard = (columnId: string) => {
        const newCard = createKanbanCard({
          title: `New Card ${columns.flatMap((c: any) => c.cards).length + 1}`,
        });
        
        const updatedColumns = columns.map((col: any) => 
          col.id === columnId
            ? { ...col, cards: [...col.cards, newCard] }
            : col
        );
        
        setColumns(updatedColumns);
      };
      
      return (
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9' }}>
          <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Custom CRM Pipeline</h2>
          <Kanban columns={columns}>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
              {columns.map((column: any, index: number) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  index={index}
                  style={{ minWidth: '300px' }}
                >
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'white', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}>
                      <h3 style={{ margin: 0, color: '#334155' }}>{column.title}</h3>
                      <button
                        onClick={() => handleAddCard(column.id)}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {column.cards.map((card: any, cardIndex: number) => (
                        <KanbanCardComponent
                          key={card.id}
                          card={card}
                          column={column}
                          index={cardIndex}
                          style={{ 
                            padding: '12px', 
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '500' }}>{card.title}</span>
                            {card.value && (
                              <span style={{ 
                                fontSize: '12px', 
                                color: '#059669',
                                fontWeight: 'bold',
                              }}>
                                ${card.value.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </KanbanCardComponent>
                      ))}
                    </div>
                  </div>
                </KanbanColumnComponent>
              ))}
            </div>
          </Kanban>
        </div>
      );
    };
    
    return <CustomKanban />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Example using Kanban compound components (Kanban.Column, Kanban.Card) with custom layout and behavior.',
      },
    },
  },
};

/**
 * Interactive Example with State Management
 */
export const Interactive: Story = {
  render: () => {
    const [columns, setColumns] = React.useState(lightweightColumns);
    const analytics = React.useMemo(() => calculateAnalyticsFromColumns(columns), [columns]);
    
    const handleChange = (newColumns: typeof columns) => {
      setColumns(newColumns);
    };
    
    const handleAddColumn = () => {
      const newColumn = createKanbanColumn({
        title: `Stage ${columns.length + 1}`,
        cards: [],
      });
      setColumns([...columns, newColumn]);
    };
    
    const handleAddCard = (column: typeof columns[0]) => {
      const newCard = createKanbanCard({
        title: `New Opportunity ${Date.now().toString().slice(-4)}`,
        value: Math.floor(Math.random() * 100000) + 10000,
        probability: Math.floor(Math.random() * 100),
      });
      
      const updatedColumns = columns.map(col => 
        col.id === column.id
          ? { ...col, cards: [...col.cards, newCard] }
          : col
      );
      
      setColumns(updatedColumns);
    };
    
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#1e293b' }}>CRM Pipeline</h1>
            <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
              Manage your sales opportunities and track deal progress
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              ${analytics.totalValue.toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Total Pipeline Value</div>
          </div>
        </div>
        
        <Kanban
          columns={columns}
          onChange={handleChange}
          onAddColumn={handleAddColumn}
          onAddCard={handleAddCard}
          showAnalytics={true}
          analytics={analytics}
          showCardValue={true}
          showProbability={true}
          showCardCounts={true}
          allowCardMoveBetweenColumns={true}
          allowCardReorder={true}
          allowColumnReorder={true}
          style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px' }}
          data-testid="kanban-interactive"
        />
        
        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          backgroundColor: 'white', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Pipeline Controls</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddColumn}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              + Add New Stage
            </button>
            <button
              onClick={() => {
                const randomColumn = columns[Math.floor(Math.random() * columns.length)];
                handleAddCard(randomColumn);
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              + Add Random Opportunity
            </button>
            <button
              onClick={() => {
                // Reset to lightweight data
                setColumns(lightweightColumns);
              }}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive Kanban example with state management, dynamic updates, and control panel. Uses performance-optimized columns.',
      },
    },
  },
};

/**
 * Dark Mode Example
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh' }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    columns: lightweightColumns,
    showAnalytics: true,
    showCardValue: true,
    'data-testid': 'kanban-dark-mode',
  },
};

/**
 * Playground - Interactive Controls
 */
export const Playground: Story = {
  args: {
    columns: lightweightColumns,
    readOnly: false,
    showColumnActions: true,
    showCardActions: true,
    allowColumnReorder: true,
    allowCardReorder: true,
    allowCardMoveBetweenColumns: true,
    showAnalytics: false,
    showCardValue: true,
    showProbability: true,
    showCardCounts: true,
    showWipLimits: false,
    maxHeight: '600px',
    minColumnWidth: '280px',
    'data-testid': 'kanban-playground',
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive playground with controls to test all Kanban features. Use Storybook controls panel to adjust props.',
      },
    },
  },
};