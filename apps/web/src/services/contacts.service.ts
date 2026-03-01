// apps/web/src/services/contacts.service.ts
import { apiClient } from './api';
import { components } from '../lib/types/generated/api';

// Use the properly generated component schemas
export type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  department?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

// Use the generated DTO types
export type CreateContactDto = components['schemas']['CreateContactDto'];
export type UpdateContactDto = components['schemas']['UpdateContactDto'];

export const contactsService = {
  // Get all contacts with pagination
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<Contact[]> => {
    const response = await apiClient.get<{ data: Contact[] }>('/contacts', { params });
    return response.data;
  },

  // Get single contact by ID
  getById: async (id: string): Promise<Contact> => {
    const response = await apiClient.get<{ data: Contact }>(`/contacts/${id}`);
    return response.data;
  },

  // Create new contact
  create: async (data: CreateContactDto): Promise<Contact> => {
    const response = await apiClient.post<{ data: Contact }>('/contacts', data);
    return response.data;
  },

  // Update existing contact
  update: async (id: string, data: UpdateContactDto): Promise<Contact> => {
    const response = await apiClient.put<{ data: Contact }>(`/contacts/${id}`, data);
    return response.data;
  },

  // Delete contact
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contacts/${id}`);
  },
};