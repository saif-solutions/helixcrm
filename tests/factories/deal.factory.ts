// test/factories/deal.factory.ts
export enum DealStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
  ABANDONED = 'ABANDONED',
}

export const createMockDeal = (overrides = {}) => ({
  id: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Deal',
  value: 10000,
  currency: 'USD',
  status: DealStatus.OPEN,
  stageId: 'stage-123',
  pipelineId: 'pipeline-123',
  contactId: 'contact-123',
  leadId: null,
  assignedToId: 'user-123',
  tenantId: 'tenant-123',
  expectedCloseDate: new Date('2024-02-01'),
  actualCloseDate: null,
  notes: 'Test notes',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});
