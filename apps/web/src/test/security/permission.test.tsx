import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePermission } from '../../lib/hooks/usePermission';
import { RequirePermission } from '../../components/auth/RequirePermission';
import { useAuthStore } from '../../stores/auth.store';

// Mock the auth store
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      organizationId: 'org-123',
      role: 'user',
      permissions: ['contact:read', 'lead:read', 'deal:read'],
    },
  })),
}));

describe('Permission System Security Tests', () => {
  describe('usePermission Hook', () => {
    it('should return correct permissions for user', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.hasPermission('contact:read')).toBe(true);
      expect(result.current.hasPermission('contact:write')).toBe(false);
      expect(result.current.hasPermission('lead:read')).toBe(true);
      expect(result.current.hasPermission('deal:read')).toBe(true);
    });

    it('should handle hasAnyPermission correctly', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.hasAnyPermission(['contact:read', 'contact:write'])).toBe(true);
      expect(result.current.hasAnyPermission(['contact:write', 'deal:write'])).toBe(false);
      expect(result.current.hasAnyPermission([])).toBe(false);
    });

    it('should handle hasAllPermissions correctly', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.hasAllPermissions(['contact:read', 'lead:read'])).toBe(true);
      expect(result.current.hasAllPermissions(['contact:read', 'contact:write'])).toBe(false);
    });
  });

  describe('Admin User Tests', () => {
    // Override mock for admin user
    beforeEach(() => {
      vi.mocked(useAuthStore).mockImplementation(() => ({
        user: {
          id: 'admin-user',
          email: 'admin@example.com',
          organizationId: 'org-123',
          role: 'admin',
          permissions: ['*'],
        },
      }));
    });

    it('should grant all permissions to admin users', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.hasPermission('contact:write')).toBe(true);
      expect(result.current.hasPermission('user:delete')).toBe(true);
      expect(result.current.hasPermission('any:random')).toBe(true);
    });
  });

  describe('RequirePermission Component', () => {
    it('should render children when user has permission', () => {
      render(
        <RequirePermission permission="contact:read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user lacks permission', () => {
      render(
        <RequirePermission permission="contact:write">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render fallback when provided and permission denied', () => {
      render(
        <RequirePermission
          permission="contact:write"
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should handle anyPermission prop correctly', () => {
      render(
        <RequirePermission anyPermission={['contact:read', 'contact:write']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle allPermissions prop correctly', () => {
      render(
        <RequirePermission allPermissions={['contact:read', 'lead:read']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle role prop correctly', () => {
      render(
        <RequirePermission role="admin">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle empty permissions array', () => {
      vi.mocked(useAuthStore).mockImplementation(() => ({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          organizationId: 'org-123',
          role: 'user',
          permissions: [],
        },
      }));

      const { result } = renderHook(() => usePermission());

      expect(result.current.hasPermission('contact:read')).toBe(false);
      expect(result.current.hasAnyPermission(['contact:read'])).toBe(false);
    });

    it('should handle undefined user', () => {
      vi.mocked(useAuthStore).mockImplementation(() => ({
        user: null,
      }));

      const { result } = renderHook(() => usePermission());

      expect(result.current.hasPermission('contact:read')).toBe(false);
      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });

    it('should handle wildcard permissions correctly', () => {
      vi.mocked(useAuthStore).mockImplementation(() => ({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          organizationId: 'org-123',
          role: 'user',
          permissions: ['*'],
        },
      }));

      const { result } = renderHook(() => usePermission());

      expect(result.current.hasPermission('anything')).toBe(true);
      expect(result.current.hasPermission('user:delete')).toBe(true);
    });
  });
});
