// apps/api/src/shared/auth/interfaces/auth-service.interface.ts
export interface IAuthService {
  validateUser(userId: string, organizationId: string): Promise<any>;
  getUserPermissions(userId: string, organizationId: string): Promise<string[]>;
}

export const AUTH_SERVICE = 'AUTH_SERVICE';
