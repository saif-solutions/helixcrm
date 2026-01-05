// apps/api/src/shared/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // user id
  email: string;
  organizationId: string;
  role: string;
  tokenVersion: number; // MUST match user.tokenVersion
  iat?: number;
  exp?: number;
}