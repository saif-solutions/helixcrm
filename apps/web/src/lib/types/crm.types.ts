// apps/web/src/lib/types/crm.types.ts

// ============================================================================
// BASE TYPES
// ============================================================================

export interface TimestampEntity {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface OrganizationEntity {
  organizationId: string;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified';

export interface Lead extends TimestampEntity, OrganizationEntity {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source?: string;
  company?: string;
  title?: string;
  notes?: string;
  assignedTo?: string;
  estimatedValue?: number;
  convertedToContactId?: string;
  convertedToDealId?: string;
  lastContactedAt?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  source?: string;
  company?: string;
  title?: string;
  notes?: string;
  assignedTo?: string;
  estimatedValue?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// This empty interface is intentional for extensibility
export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface Contact extends TimestampEntity, OrganizationEntity {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  leadSource?: string;
  status?: string;
  notes?: string;
  assignedTo?: string;
  dateOfBirth?: string;
  anniversary?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  leadSource?: string;
  status?: string;
  notes?: string;
  assignedTo?: string;
  dateOfBirth?: string;
  anniversary?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

// This empty interface is intentional for extensibility
export interface UpdateContactDto extends Partial<CreateContactDto> {}

// ============================================================================
// DEAL TYPES (PHASE 3.4)
// ============================================================================

export type DealStatus = 'open' | 'won' | 'lost' | 'abandoned';
export type DealPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Deal extends TimestampEntity, OrganizationEntity {
  id: string;
  // Phase 3.4 simplified fields
  name: string; // Maps to 'title' in frontend
  amount: number; // Maps to 'value' in frontend
  stageId: string;
  stageName?: string;
  probability: number;
  status: DealStatus;
  priority?: DealPriority;

  // Optional fields
  ownerUserId?: string;
  ownerName?: string;
  contactId?: string;
  contactName?: string;
  accountId?: string;
  accountName?: string;
  pipelineId: string;
  pipelineName?: string;
  currency?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;

  // Additional metadata
  description?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;

  // Calculated fields
  daysInStage?: number;
  lastStageChangeAt?: string;
  forecastCategory?: 'pipeline' | 'best_case' | 'commit' | 'closed';
}

// Phase 3.4 Simplified Deal Creation DTO
export interface CreateDealSimpleDto {
  // Required fields for Phase 3.4 simplified creation
  name: string; // Maps to 'title' in frontend
  amount: number; // Maps to 'value' in frontend
  stageId: string;

  // Optional fields
  contactId?: string;
  accountId?: string;
  ownerUserId?: string;
  currency?: string;
  expectedCloseDate?: string;
  description?: string;
  probability?: number;
  status?: DealStatus;
  priority?: DealPriority;
}

export interface UpdateDealDto {
  name?: string;
  amount?: number;
  stageId?: string;
  probability?: number;
  status?: DealStatus;
  priority?: DealPriority;
  ownerUserId?: string;
  contactId?: string;
  accountId?: string;
  currency?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// ============================================================================
// PIPELINE & STAGE TYPES
// ============================================================================

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DASHBOARD TYPES (PHASE 3.4 ENHANCED)
// ============================================================================

export interface DashboardSummary {
  leads: number;
  contacts: number;
  deals: number;
  totalWonValue: number;
  averageDealValue: number;
  winRate: number;
  conversionRate: number;
  activeDeals: number;
  overdueDeals: number;
  dealsThisMonth: number;
  dealsWonThisMonth: number;
  dealsLostThisMonth: number;
  newLeadsThisWeek: number;
}

export interface PipelineStageStats {
  stageId: string;
  stageName: string;
  order: number;
  probability: number;
  dealCount: number;
  totalValue: number;
  averageDealSize: number;
  avgDaysInStage: number;
}

export interface PipelineStats {
  id: string;
  name: string;
  totalDeals: number;
  totalValue: number;
  weightedForecast: number;
  stages: PipelineStageStats[];
  topDeals: Array<{
    id: string;
    name: string;
    amount: number;
    stageName: string;
    expectedCloseDate?: string;
  }>;
}

export interface DealStatusDistribution {
  open: number;
  won: number;
  lost: number;
  abandoned: number;
}

export interface LeadSourceStats {
  source: string;
  count: number;
  percentage: number;
  convertedCount: number;
  conversionRate: number;
}

export interface ActivityStats {
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId: string;
    userName: string;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    assignedTo: string;
  }>;
}

export interface DashboardStats {
  summary: DashboardSummary;
  pipeline?: PipelineStats;
  dealStatus: DealStatusDistribution;
  leadSources: LeadSourceStats[];
  activities: ActivityStats;
  period: {
    startDate: string;
    endDate: string;
  };
  lastUpdated: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  stageId?: string;
  pipelineId?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export type QueryParams = PaginationParams & SortParams & FilterParams;

// ============================================================================
// FORM TYPES FOR COMPONENTS
// ============================================================================

// Frontend form interfaces (mapping between frontend naming and backend DTOs)
export interface DealFormData {
  // Frontend names (maps to backend DTO)
  title: string; // Maps to 'name' in CreateDealSimpleDto
  value: number; // Maps to 'amount' in CreateDealSimpleDto
  stageId: string;
  contactId?: string;
  accountId?: string;
  ownerUserId?: string;
  currency?: string;
  expectedCloseDate?: string;
  description?: string;
  probability?: number;
  status?: DealStatus;
  priority?: DealPriority;
}

// Helper function to convert frontend form data to Phase 3.4 DTO
export const mapDealFormToPhase3Dto = (formData: DealFormData): CreateDealSimpleDto => {
  return {
    name: formData.title,
    amount: formData.value,
    stageId: formData.stageId,
    contactId: formData.contactId,
    accountId: formData.accountId,
    ownerUserId: formData.ownerUserId,
    currency: formData.currency || 'USD',
    expectedCloseDate: formData.expectedCloseDate,
    description: formData.description,
    probability: formData.probability || 0,
    status: formData.status || 'open',
    priority: formData.priority || 'medium',
  };
};

// Helper function to convert backend deal to frontend display
export const mapBackendDealToFrontend = (deal: Deal): DealFormData => {
  return {
    title: deal.name,
    value: deal.amount,
    stageId: deal.stageId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    ownerUserId: deal.ownerUserId,
    currency: deal.currency || 'USD',
    expectedCloseDate: deal.expectedCloseDate,
    description: deal.description,
    probability: deal.probability,
    status: deal.status,
    priority: deal.priority,
  };
};
