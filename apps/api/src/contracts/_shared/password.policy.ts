// apps/api/src/contracts/_shared/password.policy.ts
/**
 * Shared password policy for consistent validation across all contracts
 */
export class PasswordPolicy {
  /**
   * Validate password strength requirements
   */
  static validateStrength(password: string): string[] {
    const errors: string[] = [];
    
    if (!password) {
      return errors;
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common passwords
    const commonPasswords = [
      'password123', 'admin123', 'letmein', 'qwerty', '123456',
      'password', 'admin', 'welcome', 'monkey', '123456789'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }
    
    // Check for sequential characters
    if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
      errors.push('Password contains sequential characters');
    }
    
    return errors;
  }

  /**
   * Validate password confirmation match
   */
  static validateMatch(password: string, confirmPassword: string): string[] {
    const errors: string[] = [];
    
    if (!password || !confirmPassword) {
      return errors;
    }
    
    if (password !== confirmPassword) {
      errors.push('Password and confirmation do not match');
    }
    
    return errors;
  }

  /**
   * Validate password change (cannot be same as old password)
   */
  static validateChange(oldPassword: string, newPassword: string): string[] {
    const errors: string[] = [];
    
    if (!oldPassword || !newPassword) {
      return errors;
    }
    
    if (oldPassword === newPassword) {
      errors.push('New password must be different from current password');
    }
    
    return errors;
  }
}