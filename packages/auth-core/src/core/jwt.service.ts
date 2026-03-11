/**
 * JWT Service for access token operations
 * Pure implementation with no external dependencies
 */

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../contracts/auth.contract';

export interface JwtServiceOptions {
  secret: string;
  expiresIn: string;
}

export class JwtService {
  constructor(private readonly options: JwtServiceOptions) {}

  /**
   * Issue a new JWT access token
   */
  issueToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const { secret, expiresIn } = this.options;

    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'helixcrm',
      audience: 'helixcrm-api',
    });
  }

  /**
   * Validate and decode a JWT token
   * Returns null for invalid/expired tokens
   */
  validateToken(token: string): JwtPayload | null {
    try {
      const { secret } = this.options;
      const decoded = jwt.verify(token, secret, {
        issuer: 'helixcrm',
        audience: 'helixcrm-api',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      // Invalid token, expired, or verification failed
      return null;
    }
  }
}
