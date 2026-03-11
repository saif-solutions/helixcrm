import {
  PERMISSION_KEY,
  IS_PUBLIC_KEY,
  RequirePermission,
  Public,
  AdminOnly,
} from '@api/shared/decorators/require-permission.decorator';
import { SetMetadata } from '@nestjs/common';

// Mock SetMetadata to capture calls
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockImplementation((key, value) => ({ key, value })),
}));

describe('RequirePermission Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RequirePermission', () => {
    it('should set metadata with single permission string', () => {
      const result = RequirePermission('user:read');

      expect(SetMetadata).toHaveBeenCalledWith(PERMISSION_KEY, ['user:read']);
      expect(result).toEqual({ key: PERMISSION_KEY, value: ['user:read'] });
    });

    it('should set metadata with array of permissions', () => {
      const permissions = ['user:read', 'user:write', 'deal:read'];
      const result = RequirePermission(permissions);

      expect(SetMetadata).toHaveBeenCalledWith(PERMISSION_KEY, permissions);
      expect(result).toEqual({ key: PERMISSION_KEY, value: permissions });
    });

    it('should handle empty array', () => {
      const result = RequirePermission([]);

      expect(SetMetadata).toHaveBeenCalledWith(PERMISSION_KEY, []);
      expect(result).toEqual({ key: PERMISSION_KEY, value: [] });
    });
  });

  describe('Public', () => {
    it('should set public metadata to true', () => {
      const result = Public();

      expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
      expect(result).toEqual({ key: IS_PUBLIC_KEY, value: true });
    });
  });

  describe('AdminOnly', () => {
    it('should set permission metadata for admin', () => {
      const result = AdminOnly();

      expect(SetMetadata).toHaveBeenCalledWith(PERMISSION_KEY, ['rbac:manage']);
      expect(result).toEqual({ key: PERMISSION_KEY, value: ['rbac:manage'] });
    });
  });
});
