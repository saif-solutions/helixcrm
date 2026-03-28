// apps/api/src/contracts/auth.contract.ts
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  IsBoolean,
  IsJWT,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PasswordPolicy } from '../shared/password.policy';

export enum AuthAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REFRESH = 'refresh',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
}

// Read-only response DTOs — never used as input
export class AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    permissions: string[];
    roles: string[];
  };
  expires_in: number;
  token_type: string = 'Bearer';
}

export class LoginInput {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  password: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  rememberMe?: boolean = false;

  validateInvariants(): string[] {
    return [
      ...AuthInvariants.validateEmailFormat(this),
      // validateLoginAttempt deferred to service layer (requires context)
    ];
  }
}

export class RegisterInput {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  confirmPassword: string;

  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  inviteToken?: string; // If inviteToken is provided, organizationName is ignored

  validateInvariants(): string[] {
    return [
      ...AuthInvariants.validateEmailFormat(this),
      ...AuthInvariants.validatePasswordMatch(this),
      ...AuthInvariants.validatePasswordStrength(this),
    ];
  }
}

export class RefreshTokenInput {
  @IsJWT()
  @IsNotEmpty()
  refresh_token: string;

  validateInvariants(): string[] {
    return AuthInvariants.validateTokenFormat(this);
  }
}

export class ForgotPasswordInput {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  resetUrl?: string;

  validateInvariants(): string[] {
    return AuthInvariants.validateEmailFormat(this);
  }
}

export class ResetPasswordInput {
  @IsString()
  @IsNotEmpty()
  token: string; // JWT reset token

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  confirmPassword: string;

  validateInvariants(): string[] {
    return [
      ...PasswordPolicy.validateMatch(this.newPassword, this.confirmPassword),
      ...PasswordPolicy.validateStrength(this.newPassword),
    ];
  }
}

export class LogoutInput {
  @IsOptional()
  @IsJWT()
  refresh_token?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allDevices?: boolean = false;
}

export class VerifyEmailInput {
  @IsString()
  @IsNotEmpty()
  token: string; // JWT verification token
}

export class AuthQueryParams {
  @IsOptional()
  @IsEnum(AuthAction)
  action?: AuthAction;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

/**
 * Business invariants validation for authentication
 */
export class AuthInvariants {
  /**
   * Invariant: Email format validation (beyond basic @ validation)
   */
  static validateEmailFormat(input: { email: string }): string[] {
    const errors: string[] = [];

    // Defensive check
    if (!input.email) {
      return errors;
    }

    const email = input.email.toLowerCase();

    // Check for common typos
    if (
      email.includes('@gmail.cm') ||
      email.includes('@gmil.com') ||
      email.includes('@gmal.com')
    ) {
      errors.push('Email domain appears to have a typo');
    }

    // Check for disposable emails
    const disposableDomains = [
      'tempmail.com',
      'throwaway.com',
      'mailinator.com',
      'guerrillamail.com',
      '10minutemail.com',
      'yopmail.com',
    ];

    const domain = email.split('@')[1];
    if (domain && disposableDomains.some((d) => domain.includes(d))) {
      errors.push('Disposable email addresses are not allowed');
    }

    return errors;
  }

  /**
   * Invariant: Password strength requirements (using shared policy)
   */
  static validatePasswordStrength(input: { password: string }): string[] {
    return PasswordPolicy.validateStrength(input.password);
  }

  /**
   * Invariant: Password confirmation match (using shared policy)
   */
  static validatePasswordMatch(input: {
    password: string;
    confirmPassword: string;
  }): string[] {
    return PasswordPolicy.validateMatch(input.password, input.confirmPassword);
  }

  /**
   * Invariant: Token format validation (structural only)
   */
  static validateTokenFormat(input: { refresh_token: string }): string[] {
    const errors: string[] = [];
    const token = input.refresh_token;

    if (!token) {
      return errors;
    }

    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      errors.push('Invalid token format');
    }

    return errors;
  }

  /**
   * Invariant: Login attempt validation (requires service context)
   * Note: Deferred to service layer for proper context
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateLoginAttempt(_input: LoginInput): string[] {
    // This requires service context (rate limiting, user state, etc.)
    // Implementation deferred to service layer
    return [];
  }

  /**
   * Invariant: Rate limiting check (requires external state)
   * This is a placeholder for actual rate limiting implementation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateRateLimit(_context: {
    ipAddress?: string;
    email?: string;
  }): string[] {
    // This would require external state (Redis, etc.)
    // For Phase 1, we just document the invariant
    return [];
  }
}

// Token payload interfaces (not DTOs, used for typing)
export interface JwtPayload {
  sub: string; // User ID
  org: string; // Organization ID
  role: string; // User role
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
  version: number; // Token version for invalidation
  email?: string; // User email
  permissions?: string[]; // User permissions
  roles?: string[]; // User roles
}

export interface RefreshTokenPayload extends JwtPayload {
  type: TokenType.REFRESH;
  jti: string; // Required for refresh tokens
}

export interface AccessTokenPayload extends JwtPayload {
  type: TokenType.ACCESS;
}

export interface PasswordResetTokenPayload {
  sub: string; // user id
  email: string;
  action: 'password_reset';
  iat: number;
  exp: number;
}
