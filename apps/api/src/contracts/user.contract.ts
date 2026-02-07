// apps/api/src/contracts/user.contract.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, Length, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PasswordPolicy } from './_shared/password.policy';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
  MANAGER = 'manager',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

// Read-only response DTO — never used as input
export class UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole; // MVP: single role per user; may expand to multiple roles later
  status: UserStatus;
  isActive: boolean;
  organizationId: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export class CreateUserInput {
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
  @IsOptional()
  @Length(8, 100)
  password?: string; // Required unless user is created via invite or SSO

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.USER;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus = UserStatus.ACTIVE;

  // Invariant: Organization ID is required
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  /**
   * Validate business invariants beyond basic field validation
   * @returns Array of error messages, empty array if valid
   */
  validateInvariants(): string[] {
    const errors: string[] = [];
    
    // Email domain validation
    errors.push(...UserInvariants.validateEmailDomain(this));
    
    // Password validation (only if password is provided)
    if (this.password) {
      errors.push(...PasswordPolicy.validateStrength(this.password));
    }
    
    // Role validation (documentation only - actual validation in service layer)
    errors.push(...UserInvariants.validateRoleAssignment(this));
    
    return errors;
  }
}

export class UpdateUserInput {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Invariant: Cannot demote last admin (enforced at service layer)
  @IsOptional()
  @IsString()
  updatedBy?: string; // User ID of who is making the change
}

export class UserQueryParams {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class ChangePasswordInput {
  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  currentPassword: string;

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
      ...PasswordPolicy.validateChange(this.currentPassword, this.newPassword),
    ];
  }
}

/**
 * Business invariants validation
 * These rules cannot be expressed with simple field validators
 */
export class UserInvariants {
  /**
   * Invariant: Email domain restrictions
   */
  static validateEmailDomain(input: { email: string }): string[] {
    const errors: string[] = [];
    
    if (!input.email) {
      return errors;
    }
    
    const email = input.email.toLowerCase();
    const domain = email.split('@')[1];
    
    if (!domain) {
      return errors;
    }
    
    // Block disposable email domains
    const disposableDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com'];
    
    if (disposableDomains.some(d => domain.includes(d))) {
      errors.push('Disposable email domains are not allowed');
    }
    
    return errors;
  }

  /**
   * Invariant: Role assignment rules
   * NOTE: Last-admin and permission checks enforced at service layer
   */
  static validateRoleAssignment(_input: { role?: UserRole; updatedBy?: string }): string[] {
    // Role validation requires runtime context (database state, permissions)
    // This is documented here but enforced at service layer
    return [];
  }
}

export class BatchUserInput {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserInput)
  users: CreateUserInput[];

  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean = false;

  validateInvariants(): string[] {
    const errors: string[] = [];
    
    // Check for duplicate emails
    const emails = this.users.map(u => u.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate emails found: ${Array.from(new Set(duplicates)).join(', ')}`);
    }
    
    // Validate each user
    this.users.forEach((user, index) => {
      const userErrors = user.validateInvariants();
      if (userErrors.length > 0) {
        errors.push(`User ${index + 1} (${user.email}): ${userErrors.join(', ')}`);
      }
    });
    
    return errors;
  }
}