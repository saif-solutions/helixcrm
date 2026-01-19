// apps/web/src/services/leads.service.ts
import { apiClient } from './api';
import {
  Lead,
  LeadStatus,
  LeadsListResponse,
  LeadsStats,
  CreateLeadDto,
  UpdateLeadDto
} from '../lib/types/api.types';

export interface LeadQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: LeadStatus;
}

export interface LeadStatsResponse extends LeadsStats {
  conversionRate: number;
}

export const leadsService = {
  // Get paginated leads with filters
  getLeads: async (params: LeadQueryParams): Promise<LeadsListResponse> => {
    const { page = 1, limit = 20, search, status } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) queryParams.append('search', search);
    if (status) queryParams.append('status', status);
    
    return apiClient.get<LeadsListResponse>(`/leads?${queryParams.toString()}`);
  },
  
  // Get single lead by ID
  getLeadById: async (id: string): Promise<Lead> => {
    return apiClient.get<Lead>(`/leads/${id}`);
  },
  
  // Create new lead
  createLead: async (data: CreateLeadDto): Promise<Lead> => {
    return apiClient.post<Lead>('/leads', data);
  },
  
  // Update existing lead
  updateLead: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    return apiClient.put<Lead>(`/leads/${id}`, data);
  },
  
  // Delete lead
  deleteLead: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/leads/${id}`);
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
      conversionRate: Math.round(conversionRate * 100) / 100 // Round to 2 decimal places
    };
  },
};