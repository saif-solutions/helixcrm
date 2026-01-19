// apps/web/src/lib/types/lead.types.ts
import { Lead, LeadStatus, PaginationMeta } from './api.types';

// Re-export with extended interfaces
export interface LeadQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: LeadStatus;
}

export interface LeadsListResponse {
  data: Lead[];
  meta: PaginationMeta;
}

export interface LeadStatsResponse {
  total: number;
  byStatus: Record<LeadStatus, number>;
  recentCount: number;
  conversionRate: number;
}

// For backward compatibility
export type CreateLeadRequest = {
  name: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
};

export type UpdateLeadRequest = Partial<CreateLeadRequest>;