// apps/api/src/shared/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
  role: string;
  tokenVersion: number; // MUST match user.tokenVersion
  // PHASE 3.3 ADDITIONS
  permissions: string[]; // flattened permissions array
  roles: string[]; // role names for auditing
  iat?: number;
  exp?: number;
}
