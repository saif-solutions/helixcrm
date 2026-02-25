import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();
    const requestId = uuidv4();

    // Attach to request object
    (req as any).correlationId = correlationId;
    (req as any).requestId = requestId;

    // Set response headers
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
