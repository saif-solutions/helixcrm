// apps/web/src/services/contacts.service.ts
import { apiClient } from './api';
import { Contact, CreateContactDto, UpdateContactDto } from '../lib/types/api.types';

export const contactsService = {
  // Get all contacts
  getAll: async (): Promise<Contact[]> => {
    return apiClient.get<Contact[]>('/contacts');
  },

  // Get single contact by ID
  getById: async (id: string): Promise<Contact> => {
    return apiClient.get<Contact>(`/contacts/${id}`);
  },

  // Create new contact
  create: async (data: CreateContactDto): Promise<Contact> => {
    return apiClient.post<Contact>('/contacts', data);
  },

  // Update existing contact
  update: async (id: string, data: UpdateContactDto): Promise<Contact> => {
    return apiClient.put<Contact>(`/contacts/${id}`, data);
  },

  // Delete contact
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/contacts/${id}`);
  },
};
