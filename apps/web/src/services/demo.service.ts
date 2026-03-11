import { apiClient } from './api';

export interface DemoAccount {
  role: string;
  email: string;
}

export interface DemoResponse {
  enabled: boolean;
  accounts?: DemoAccount[];
  message?: string;
}

export const demoService = {
  async getDemoAccounts(): Promise<DemoResponse> {
    try {
      const response = await apiClient.get<DemoResponse>('/demo/credentials');
      return response;
    } catch (error) {
      console.error('Failed to fetch demo accounts:', error);
      return { enabled: false };
    }
  },

  async loginWithDemo(role: 'admin' | 'user'): Promise<void> {
    await apiClient.post(`/demo/login/${role}`);
    // After successful login, page will redirect to dashboard
  },
};
