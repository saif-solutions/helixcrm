// apps/api/src/shared/types/request.types.ts
import { Request } from 'express';

export interface UserPayload {
  sub: string;
  email: string;
  organizationId: string;
  org?: string;
  permissions?: string[];
  roles?: string[];
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

export function hasUser(req: unknown): req is AuthenticatedRequest {
  return typeof req === 'object' && req !== null && 'user' in req;
}
