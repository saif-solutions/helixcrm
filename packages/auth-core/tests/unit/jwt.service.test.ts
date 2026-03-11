/**
 * Unit tests for JWT Service
 * These test the isolated JWT service implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JwtService } from '../../src/core/jwt.service';

describe('JWT Service', () => {
  const TEST_SECRET = 'test-secret-key-1234567890';
  const TEST_EXPIRES_IN = '1h';

  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({
      secret: TEST_SECRET,
      expiresIn: TEST_EXPIRES_IN,
    });
  });

  describe('issueToken', () => {
    it('should issue a valid JWT token', () => {
      const payload = {
        sub: 'user-123',
        org: 'org-456',
        role: 'user',
        version: 1,
      };

      const token = jwtService.issueToken(payload);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields in token', () => {
      const payload = {
        sub: 'user-123',
        org: 'org-456',
        role: 'admin',
        version: 2,
      };

      const token = jwtService.issueToken(payload);
      const decoded = jwtService.validateToken(token);

      expect(decoded).toBeTruthy();
      if (decoded) {
        expect(decoded.sub).toBe(payload.sub);
        expect(decoded.org).toBe(payload.org);
        expect(decoded.role).toBe(payload.role);
        expect(decoded.version).toBe(payload.version);
        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');
      }
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const payload = {
        sub: 'user-123',
        org: 'org-456',
        role: 'user',
        version: 1,
      };

      const token = jwtService.issueToken(payload);
      const decoded = jwtService.validateToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe(payload.sub);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      const decoded = jwtService.validateToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const payload = {
        sub: 'user-123',
        org: 'org-456',
        role: 'user',
        version: 1,
      };

      const token = jwtService.issueToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx'; // Tamper with signature
      const decoded = jwtService.validateToken(tamperedToken);

      expect(decoded).toBeNull();
    });

    it('should validate token with different secret', () => {
      const otherService = new JwtService({
        secret: 'different-secret',
        expiresIn: TEST_EXPIRES_IN,
      });

      const payload = {
        sub: 'user-123',
        org: 'org-456',
        role: 'user',
        version: 1,
      };

      const token = jwtService.issueToken(payload); // Signed with TEST_SECRET
      const decoded = otherService.validateToken(token); // Validated with different secret

      expect(decoded).toBeNull(); // Should fail validation
    });
  });
});
