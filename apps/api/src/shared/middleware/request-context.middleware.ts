import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Reuse incoming request ID or generate cryptographically strong one
    const incomingId = req.header('X-Request-ID');
    const requestId = incomingId || randomUUID();
    
    // Attach request ID to request object
    (req as any).requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    next();
  }
}
