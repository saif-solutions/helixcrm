import { api } from './api';
export class ContactsService {
    async getAll() {
        const response = await api.getContacts();
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data || [];
    }
    async getById(id) {
        const response = await api.getContact(id);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Contact not found');
        }
        return response.data;
    }
    async create(contact) {
        const response = await api.createContact(contact);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to create contact');
        }
        return response.data;
    }
    async update(id, contact) {
        const response = await api.updateContact(id, contact);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to update contact');
        }
        return response.data;
    }
    async delete(id) {
        const response = await api.deleteContact(id);
        if (response.error) {
            throw new Error(response.error);
        }
    }
}
export const contactsService = new ContactsService();
