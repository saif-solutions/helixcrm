import { Request } from 'express';

export interface UserPayload {
  sub: string;
  email: string;
  organizationId: string;
  permissions?: string[];
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

export interface RegisterResult {
  id: string;
  email: string;
  organizationId: string;
  message: string;
  user?: {
    id: string;
    email: string;
  };
  userId?: string;
}

export interface InvalidateSessionsResult {
  invalidatedCount?: number;
  count?: number;
  message?: string;
}

export interface DebugCookieResponse {
  message: string;
  cookies: any;
  hasTestCookie: boolean;
  timestamp: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organizationId: string;
    permissions: string[];
    roles: string[];
  };
}

export interface UserSessionResponse {
  userId: string;
  email: string;
  tokenVersion: number;
  activeSessions: Array<{
    id: string;
    issuedAt: Date | null;
    lastUsed: Date | null;
    isCurrent: boolean;
    deviceInfo: string;
  }>;
  totalSessions: number;
}
