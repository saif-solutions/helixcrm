import { Request } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
  user?: {
    sub: string;
    email: string;
    organizationId: string;
    tokenVersion: number;
    [key: string]: any;
  };
}