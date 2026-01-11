const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  private getAuthHeaders(): Record<string, string> {
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

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
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

// ✅ CRITICAL: This export was missing!
export const api = new ApiService();
