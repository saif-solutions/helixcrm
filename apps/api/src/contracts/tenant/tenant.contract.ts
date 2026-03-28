// apps/api/src/contracts/tenant.contract.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEnum,
  Length,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TenantPlan {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  TRIAL = 'trial',
}

// Read-only response DTO — never used as input
export class TenantResponse {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  isActive: boolean;
  customDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TenantListResponse {
  tenants: TenantResponse[];
  total: number;
  page: number;
  limit: number;
}

export class CreateTenantInput {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan = TenantPlan.BASIC;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  slug?: string;

  // Invariant: If plan is ENTERPRISE, customDomain must be provided
  @IsOptional()
  @IsUrl({ require_tld: false })
  customDomain?: string;

  /**
   * Validate business invariants beyond basic field validation
   * @returns Array of error messages, empty array if valid
   */
  validateInvariants(): string[] {
    return [
      ...TenantInvariants.validateEnterprisePlan(this),
      ...TenantInvariants.validateSlug(this),
    ];
  }
}

export class UpdateTenantInput {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class TenantQueryParams {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

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
}

/**
 * Business invariants validation
 * These rules cannot be expressed with simple field validators
 */
export class TenantInvariants {
  /**
   * Invariant: Enterprise plan requires custom domain
   */
  static validateEnterprisePlan(input: CreateTenantInput): string[] {
    const errors: string[] = [];

    if (input.plan === TenantPlan.ENTERPRISE && !input.customDomain) {
      errors.push('Enterprise plan requires a custom domain');
    }

    return errors;
  }

  /**
   * Invariant: Slug format restrictions
   */
  static validateSlug(input: CreateTenantInput): string[] {
    const errors: string[] = [];

    if (input.slug && !/^[a-z0-9-]+$/.test(input.slug)) {
      errors.push(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    }

    return errors;
  }
}
