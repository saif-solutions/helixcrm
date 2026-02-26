/**
 * Token Manager Service for refresh token operations
 * Handles refresh token lifecycle
 */

import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { RefreshTokenPayload, TokenRepository } from '../contracts/auth.contract';

export interface TokenManagerOptions {
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
  tokenRepository: TokenRepository;
}

export class TokenManager {
  constructor(private readonly options: TokenManagerOptions) {}

  /**
   * Issue a new refresh token
   * Returns the raw token (not hashed)
   */
  async issueRefreshToken(userId: string, organizationId: string): Promise<string> {
    const { refreshTokenSecret, refreshTokenExpiresIn, tokenRepository } = this.options;
    
    // Generate unique token ID
    const tokenId = randomBytes(32).toString('hex');
    
    // Create JWT refresh token
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      jti: tokenId,
      sub: userId,
      org: organizationId,
      type: 'refresh',
    };

    const token = jwt.sign(payload, refreshTokenSecret, {
      expiresIn: refreshTokenExpiresIn,
      issuer: 'helixcrm',
      audience: 'helixcrm-api',
    });

    // Hash the token for storage (security best practice)
    const tokenHash = this.hashToken(token);
    
    // Calculate expiration date
    const expiresAt = new Date();
    const expiresInMs = this.parseExpiresIn(refreshTokenExpiresIn);
    expiresAt.setTime(expiresAt.getTime() + expiresInMs);

    // Save to repository
    await tokenRepository.saveRefreshToken({
      id: tokenId,
      userId,
      organizationId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });

    return token;
  }

  /**
   * Validate a refresh token
   * Returns null for invalid/expired tokens
   */
  validateRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const { refreshTokenSecret } = this.options;
      
      const decoded = jwt.verify(token, refreshTokenSecret, {
        issuer: 'helixcrm',
        audience: 'helixcrm-api',
      }) as RefreshTokenPayload;
      
      return decoded;
    } catch (error) {
      // Invalid token, expired, or verification failed
      return null;
    }
  }

  /**
   * Invalidate a refresh token by its ID
   */
  async invalidateToken(tokenId: string): Promise<void> {
    const { tokenRepository } = this.options;
    await tokenRepository.invalidateRefreshToken(tokenId);
  }

  /**
   * Hash a token for secure storage
   * Uses SHA-256 for fast hashing (refresh tokens are already JWT-protected)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiresIn string to milliseconds
   * Supports: '7d', '14d', '30d', '1h', '2h', etc.
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default: 7 days
    }

    const [, value, unit] = match;
    const numericValue = parseInt(value, 10);

    switch (unit) {
      case 'd': return numericValue * 24 * 60 * 60 * 1000; // days
      case 'h': return numericValue * 60 * 60 * 1000;      // hours
      case 'm': return numericValue * 60 * 1000;           // minutes
      case 's': return numericValue * 1000;                // seconds
      default: return 7 * 24 * 60 * 60 * 1000;            // default 7 days
    }
  }
}