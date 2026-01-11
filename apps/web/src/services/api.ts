const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

class ApiService {
  private getAuthToken(): string | null {
    // Try localStorage first, then sessionStorage
    // This works in browser context only
    if (typeof window !== 'undefined') {
      return localStorage.getItem('helix_token') || sessionStorage.getItem('helix_token');
    }
    return null;
  }

  private getCsrfToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('csrf_token');
    }
    return null;
  }

  private async fetchCsrfTokenIfNeeded(): Promise<void> {
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
          }
        }
      } catch (error) {
        console.warn('Failed to fetch CSRF token:', error);
      }
    }
  }

  private getAuthHeaders(method: string = 'GET'): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add CSRF token for non-GET requests
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('CSRF token missing for', method, 'request');
      }
    }

    // Add Bearer token if exists (for compatibility)
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json().catch(() => ({}));
    
    // Handle CSRF errors
    if (response.status === 403 && data.message?.includes('CSRF')) {
      console.error('CSRF validation failed');
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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Auth helper methods
  async initializeCsrf(): Promise<void> {
    await this.fetchCsrfTokenIfNeeded();
  }

  async clearCsrf(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('csrf_token');
    }
  }

  // Contacts API
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    return this.request<Contact[]>('/contacts');
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request<Contact>(`/contacts/${id}`);
  }

  async createContact(contact: CreateContactDto): Promise<ApiResponse<Contact>> {
    return this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async updateContact(id: string, contact: UpdateContactDto): Promise<ApiResponse<Contact>> {
    return this.request<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }
}

// Create and export singleton instance
export const api = new ApiService();

// Initialize CSRF token on module load (for browser environment)
if (typeof window !== 'undefined') {
  api.initializeCsrf().catch(() => {
    console.warn('Initial CSRF token fetch failed');
  });
}
