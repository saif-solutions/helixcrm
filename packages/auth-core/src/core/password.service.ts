/**
 * Password Service for secure password operations
 * Uses bcrypt for hashing and verification
 */

import bcrypt from 'bcrypt';

export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password using bcrypt
   */
  async hash(password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Invalid hash format or comparison error
      return false;
    }
  }

  /**
   * Check if a password meets basic security requirements
   * Note: This is a basic check - clients should implement more comprehensive validation
   */
  validateStrength(password: string): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (password.length < 8) {
      reasons.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      reasons.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      reasons.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      reasons.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      reasons.push('Password must contain at least one special character');
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }
}
