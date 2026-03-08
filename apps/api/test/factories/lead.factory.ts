// test/factories/lead.factory.ts
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export const createMockLead = (overrides = {}) => ({
  id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Lead',
  email: 'lead@example.com',
  phone: '+1234567890',
  company: 'Test Company',
  status: LeadStatus.NEW,
  source: 'website',
  notes: 'Test notes',
  assignedToId: 'user-123',
  tenantId: 'tenant-123',
  convertedToDealId: null,
  convertedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});