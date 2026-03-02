// apps/web/src/services/leads.service.ts
import { apiClient } from './api';
import { components } from '../lib/types/generated/api';

// Define the Lead type based on the DTO and expected response
export type Lead = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified';
  source?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

// Use the generated DTO types
export type CreateLeadDto = components['schemas']['CreateLeadDto'];
export type UpdateLeadDto = components['schemas']['UpdateLeadDto'];

export interface LeadsStats {
  total: number;
  byStatus: Record<'new' | 'contacted' | 'qualified', number>;
  recentCount: number;
}

export interface LeadQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadStatsResponse extends LeadsStats {
  conversionRate: number;
}

export const leadsService = {
  // Get paginated leads with filters
  getLeads: async (params: LeadQueryParams): Promise<PaginatedResponse<Lead>> => {
    const { page = 1, limit = 20, search, status } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) queryParams.append('search', search);
    if (status) queryParams.append('status', status);

    const response = await apiClient.get<PaginatedResponse<Lead>>(`/leads?${queryParams.toString()}`);
    return response; // Return the full paginated response
  },

  // Get single lead by ID
  getLeadById: async (id: string): Promise<Lead> => {
    const response = await apiClient.get<{ data: Lead }>(`/leads/${id}`);
    return response.data;
  },

  // Create new lead
  createLead: async (data: CreateLeadDto): Promise<Lead> => {
    const response = await apiClient.post<{ data: Lead }>('/leads', data);
    return response.data;
  },

  // Update existing lead
  updateLead: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    const response = await apiClient.put<{ data: Lead }>(`/leads/${id}`, data);
    return response.data;
  },

  // Delete lead
  deleteLead: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  // Get lead statistics
  getLeadStats: async (): Promise<LeadStatsResponse> => {
    const stats = await apiClient.get<LeadsStats>('/leads/stats');

    // Calculate conversion rate (qualified / total * 100)
    const total = stats.total || 0;
    const qualified = stats.byStatus?.qualified || 0;
    const conversionRate = total > 0 ? (qualified / total) * 100 : 0;

    return {
      ...stats,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
    };
  },
};