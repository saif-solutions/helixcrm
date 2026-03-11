# Frontend Multi-Tenant API Integration Guide

## Overview

After recent updates, the HelixCRM API requires explicit tenant context for all authenticated requests. This guide explains how to properly integrate with the API from your frontend application.

## Key Requirements

1. **Store Organization ID** after login
2. **Include `x-tenant-id` header** in all authenticated requests
3. **Handle 403/404 responses** appropriately

## Implementation Examples

### React/TypeScript Example

```typescript
// api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true,
});

// Request interceptor to add auth token and tenant header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const organizationId = localStorage.getItem('organization_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // CRITICAL: Add tenant header for all authenticated requests
  if (organizationId && !config.url?.includes('/auth/')) {
    config.headers['x-tenant-id'] = organizationId;
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Tenant context missing or invalid
      console.error('Tenant context error:', error.response.data);
      // Redirect to login or show error
    }
    return Promise.reject(error);
  }
);

export default api;
Login Flow
typescript
// auth/store.ts
interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    organizationId: string;
    // ... other fields
  };
}

async function login(email: string, password: string): Promise<void> {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const { access_token, user } = response.data;

    // Store both token AND organization ID
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('organization_id', user.organizationId);
    localStorage.setItem('user', JSON.stringify(user));

    // Configure axios defaults for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    api.defaults.headers.common['x-tenant-id'] = user.organizationId;

  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
API Service Example
typescript
// services/user.service.ts
export const userService = {
  async getProfile() {
    // The interceptor will automatically add x-tenant-id header
    const response = await api.get('/users/me');
    return response.data;
  },

  async getContacts() {
    const response = await api.get('/contacts');
    return response.data;
  },

  async createContact(data: any) {
    const response = await api.post('/contacts', data);
    return response.data;
  }
};
React Hook Example
typescript
// hooks/useApi.ts
import { useEffect, useState } from 'react';
import api from '../api/client';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.get('/users/me');
        setProfile(data.data);
      } catch (err: any) {
        setError(err);

        // Handle tenant context errors
        if (err.response?.status === 403) {
          console.error('Tenant context missing - redirecting to login');
          // Redirect to login
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, loading, error };
}
Testing with Curl
bash
# Test script for API endpoints
#!/bin/bash

# Login and capture response
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@helixcrm.com","password":"Test123!"}')

# Extract token and org ID
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
ORG_ID=$(echo $LOGIN_RESPONSE | grep -o '"organizationId":"[^"]*' | cut -d'"' -f4)

# Test endpoint with both headers
curl -v http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $ORG_ID"
Common Issues and Solutions
Issue: 403 Forbidden
Cause: Missing or invalid x-tenant-id header
Solution: Ensure tenant header is included in all authenticated requests

Issue: 404 Not Found
Cause: User exists but doesn't belong to the specified tenant
Solution: Verify organization ID is correct and user has access

Issue: 401 Unauthorized
Cause: Invalid or expired token
Solution: Refresh token or redirect to login

Best Practices
Store tenant ID immediately after login

Include tenant header in all requests (except public endpoints)

Clear tenant ID on logout

Handle 403 errors by redirecting to login

Use interceptors to automatically add headers

Validate tenant ID before making requests

Environment Variables
env
# .env
VITE_API_URL=http://localhost:3001/api/v1
VITE_API_TIMEOUT=30000
Summary
The key takeaway is that every authenticated request must include:

Authorization: Bearer <token>

x-tenant-id: <organization-id>

This ensures proper multi-tenant isolation and security.
```
