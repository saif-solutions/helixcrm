// apps/web/src/lib/types/api.types.ts

// Base API Response
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Lead Types
export type LeadStatus = 'new' | 'contacted' | 'qualified';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

export interface LeadsStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  recentCount: number;
}

// Contact Types
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  company?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  company?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

// API Query Responses
export interface LeadsListResponse {
  data: Lead[];
  meta: PaginationMeta;
}

export interface ContactsListResponse {
  data: Contact[];
  meta: PaginationMeta;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user';
}

export interface AuthResponse {
  user: AuthUser;
}

// Utility Types
export type ApiError = {
  status: number;
  message: string;
  code?: string;
  timestamp?: string;
  path?: string;
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
