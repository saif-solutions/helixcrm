const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
class ApiService {
    getAuthToken() {
        // Try localStorage first, then sessionStorage
        // This works in browser context only
        if (typeof window !== 'undefined') {
            return localStorage.getItem('helix_token') || sessionStorage.getItem('helix_token');
        }
        return null;
    }
    getAuthHeaders() {
        const token = this.getAuthToken();
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
        }
        // For development, return empty headers
        console.warn('No authentication token found');
        return {
            'Content-Type': 'application/json',
        };
    }
    async handleResponse(response) {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                error: data.message || `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
            };
        }
        return {
            data,
            status: response.status,
        };
    }
    async request(endpoint, options = {}) {
        try {
            const url = `${API_URL}${endpoint}`;
            const headers = this.getAuthHeaders();
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...(options.headers || {}),
                },
            });
            return this.handleResponse(response);
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 0,
            };
        }
    }
    // Contacts API
    async getContacts() {
        return this.request('/contacts');
    }
    async getContact(id) {
        return this.request(`/contacts/${id}`);
    }
    async createContact(contact) {
        return this.request('/contacts', {
            method: 'POST',
            body: JSON.stringify(contact),
        });
    }
    async updateContact(id, contact) {
        return this.request(`/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contact),
        });
    }
    async deleteContact(id) {
        return this.request(`/contacts/${id}`, {
            method: 'DELETE',
        });
    }
}
// ✅ CRITICAL: This export was missing!
export const api = new ApiService();
