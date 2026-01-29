import { Request } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
  correlationId?: string; // ADD THIS for distributed tracing
  user?: {
    sub: string;
    email: string;
    organizationId: string;
    tokenVersion: number;
    [key: string]: any;
  };
}

// Add this utility type for services
export type AuditableRequest = RequestWithId & {
  ip?: string;
  headers: Record<string, string>;
};