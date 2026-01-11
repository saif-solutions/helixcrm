const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ApiService {
  getAuthToken() {
    // Try localStorage first, then sessionStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('helix_token') || sessionStorage.getItem('helix_token');
    }
    return null;
  }

  getCsrfToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('csrf_token');
    }
    return null;
  }

  async fetchCsrfTokenIfNeeded() {
    if (typeof window === 'undefined') return;
    
    const hasCsrfToken = localStorage.getItem('csrf_token');
    if (!hasCsrfToken) {
      try {
        const response = await fetch(`${API_URL}/auth/csrf-token`, {
          credentials: 'include', // Important for cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.csrfToken) {
            localStorage.setItem('csrf_token', data.csrfToken);
            console.log('CSRF token fetched and stored');
          }
        }
      } catch (error) {
        console.warn('Failed to fetch CSRF token:', error);
      }
    }
  }

  getAuthHeaders(method = 'GET') {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add CSRF token for non-GET requests (POST, PUT, DELETE, PATCH)
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('CSRF token missing for', method, 'request - will try to fetch');
      }
    }

    // Add Bearer token if exists (for backward compatibility)
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));
    
    // Handle CSRF errors (403 with CSRF message)
    if (response.status === 403 && data.message && data.message.includes('CSRF')) {
      console.error('CSRF validation failed:', data.message);
      localStorage.removeItem('csrf_token');
      
      // Try to get new CSRF token
      await this.fetchCsrfTokenIfNeeded();
      
      return {
        error: 'CSRF validation failed. Please try again.',
        status: response.status,
      };
    }
    
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
      // Ensure CSRF token exists for non-GET requests
      const method = options.method || 'GET';
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        await this.fetchCsrfTokenIfNeeded();
      }
      
      const url = `${API_URL}${endpoint}`;
      const headers = this.getAuthHeaders(method);
      
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // CRITICAL: Include cookies for auth
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      return this.handleResponse(response);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Auth helper methods
  async initializeCsrf() {
    await this.fetchCsrfTokenIfNeeded();
  }

  clearCsrf() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('csrf_token');
    }
  }

  // Contacts API (keep existing methods)
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

// Create and export singleton instance
const api = new ApiService();

// Initialize CSRF token on module load (for browser environment)
if (typeof window !== 'undefined') {
  api.initializeCsrf().catch(() => {
    console.warn('Initial CSRF token fetch failed');
  });
}

export { api };