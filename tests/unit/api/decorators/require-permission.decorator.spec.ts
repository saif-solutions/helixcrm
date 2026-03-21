import {
  PERMISSION_KEY,
  IS_PUBLIC_KEY,
  PermissionMode,
  RequirePermission,
  Public,
  AdminOnly,
  RequireAllPermissions,
  RequireAnyPermission,
  hasRequiredPermissions,
} from '@api/shared/decorators/require-permission.decorator';
import { Reflector } from '@nestjs/core';

describe('RequirePermission Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('RequirePermission', () => {
    it('should set metadata with single permission string using default ANY mode', () => {
      class TestClass {
        @RequirePermission('user:read')
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read'],
        mode: PermissionMode.ANY,
        message: undefined,
      });
    });

    it('should set metadata with array of permissions using default ANY mode', () => {
      class TestClass {
        @RequirePermission(['user:read', 'user:write', 'deal:read'])
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read', 'user:write', 'deal:read'],
        mode: PermissionMode.ANY,
        message: undefined,
      });
    });

    it('should set metadata with ALL mode when specified', () => {
      class TestClass {
        @RequirePermission(['user:read', 'user:write'], PermissionMode.ALL)
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ALL,
        message: undefined,
      });
    });

    it('should handle empty array', () => {
      class TestClass {
        @RequirePermission([])
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: [],
        mode: PermissionMode.ANY,
        message: undefined,
      });
    });

    it('should include custom message when provided', () => {
      const customMessage = 'Custom access denied message';
      class TestClass {
        @RequirePermission('user:read', PermissionMode.ANY, customMessage)
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read'],
        mode: PermissionMode.ANY,
        message: customMessage,
      });
    });
  });

  describe('Public', () => {
    it('should set public metadata to true', () => {
      class TestClass {
        @Public()
        testMethod() {}
      }

      const metadata = reflector.get(IS_PUBLIC_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toBe(true);
    });
  });

  describe('AdminOnly', () => {
    it('should set permission metadata for admin', () => {
      class TestClass {
        @AdminOnly()
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['system:admin'],
        mode: PermissionMode.ANY,
        message: 'Admin access required',
      });
    });
  });

  describe('RequireAllPermissions', () => {
    it('should set metadata with ALL mode', () => {
      class TestClass {
        @RequireAllPermissions(['user:read', 'user:write'])
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ALL,
        message: undefined,
      });
    });

    it('should handle single permission string', () => {
      class TestClass {
        @RequireAllPermissions('user:read')
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read'],
        mode: PermissionMode.ALL,
        message: undefined,
      });
    });
  });

  describe('RequireAnyPermission', () => {
    it('should set metadata with ANY mode', () => {
      class TestClass {
        @RequireAnyPermission(['user:read', 'user:write'])
        testMethod() {}
      }

      const metadata = reflector.get(PERMISSION_KEY, TestClass.prototype.testMethod);
      
      expect(metadata).toEqual({
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ANY,
        message: undefined,
      });
    });
  });

  describe('hasRequiredPermissions', () => {
    it('should return true when ANY mode and user has at least one permission', () => {
      const userPermissions = new Set(['user:read', 'deal:write']);
      const required = {
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ANY,
      };

      expect(hasRequiredPermissions(userPermissions, required)).toBe(true);
    });

    it('should return false when ANY mode and user has none of the permissions', () => {
      const userPermissions = new Set(['deal:read']);
      const required = {
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ANY,
      };

      expect(hasRequiredPermissions(userPermissions, required)).toBe(false);
    });

    it('should return true when ALL mode and user has all permissions', () => {
      const userPermissions = new Set(['user:read', 'user:write', 'deal:read']);
      const required = {
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ALL,
      };

      expect(hasRequiredPermissions(userPermissions, required)).toBe(true);
    });

    it('should return false when ALL mode and user is missing some permissions', () => {
      const userPermissions = new Set(['user:read', 'deal:read']);
      const required = {
        permissions: ['user:read', 'user:write'],
        mode: PermissionMode.ALL,
      };

      expect(hasRequiredPermissions(userPermissions, required)).toBe(false);
    });
  });
});