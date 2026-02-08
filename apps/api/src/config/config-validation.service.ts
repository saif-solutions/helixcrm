import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/prisma/prisma.service';

export interface ValidationRule {
  key: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  defaultValue?: any;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedConfig: Record<string, any>;
}

@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);
  private validationRules: ValidationRule[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.initializeValidationRules();
  }

  private initializeValidationRules() {
    this.validationRules = [
      // Database
      {
        key: 'DATABASE_URL',
        required: true,
        type: 'string',
        minLength: 10,
        pattern: /^postgresql:\/\//,
        description: 'PostgreSQL connection URL',
      },

      // JWT Secrets (CRITICAL for security)
      {
        key: 'JWT_SECRET',
        required: true,
        type: 'string',
        minLength: 32,
        description: 'JWT access token signing secret (min 32 chars)',
      },
      {
        key: 'JWT_REFRESH_SECRET',
        required: true,
        type: 'string',
        minLength: 32,
        description:
          'JWT refresh token signing secret (min 32 chars, must be different from JWT_SECRET)',
      },

      // Application
      {
        key: 'PORT',
        required: false,
        type: 'number',
        defaultValue: 3001,
        description: 'Application port',
      },
      {
        key: 'NODE_ENV',
        required: false,
        type: 'string',
        defaultValue: 'development',
        pattern: /^(development|production|test)$/,
        description: 'Node environment (development|production|test)',
      },
      {
        key: 'CORS_ORIGIN',
        required: false,
        type: 'string',
        defaultValue: 'http://localhost:5173',
        description: 'CORS allowed origin',
      },

      // Optional but recommended
      {
        key: 'REDIS_HOST',
        required: false,
        type: 'string',
        defaultValue: 'localhost',
        description: 'Redis host for analytics and caching',
      },
      {
        key: 'REDIS_PORT',
        required: false,
        type: 'number',
        defaultValue: 6379,
        description: 'Redis port',
      },

      // CSRF (optional in dev, required in production)
      {
        key: 'CSRF_SECRET',
        required: process.env.NODE_ENV === 'production',
        type: 'string',
        minLength: 32,
        description: 'CSRF token secret',
      },

      // Token expiries (optional with defaults)
      {
        key: 'JWT_EXPIRES_IN',
        required: false,
        type: 'string',
        defaultValue: '15m',
        description: 'JWT access token expiry',
      },
      {
        key: 'JWT_REFRESH_EXPIRES_IN',
        required: false,
        type: 'string',
        defaultValue: '7d',
        description: 'JWT refresh token expiry',
      },
    ];
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedConfig: Record<string, any> = {};

    this.logger.log('��� Starting configuration validation...');

    // Step 1: Validate environment variables
    for (const rule of this.validationRules) {
      const value = this.configService.get(rule.key);
      const validation = this.validateRule(rule, value);

      if (validation.isValid) {
        validatedConfig[rule.key] = validation.value;
      } else if (rule.required) {
        errors.push(`${rule.key}: ${validation.error}`);
      } else {
        warnings.push(
          `${rule.key}: ${validation.error} - Using default: ${rule.defaultValue}`,
        );
        validatedConfig[rule.key] = rule.defaultValue;
      }
    }

    // Step 2: Validate JWT secrets are different (security best practice)
    const jwtSecret = validatedConfig['JWT_SECRET'];
    const jwtRefreshSecret = validatedConfig['JWT_REFRESH_SECRET'];

    if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
      errors.push(
        'JWT_SECRET and JWT_REFRESH_SECRET must be different for security',
      );
    }

    // Step 3: Test database connectivity
    try {
      await this.validateDatabaseConnection();
      this.logger.log('✅ Database connection validated');
    } catch (error) {
      errors.push(`Database connection failed: ${error.message}`);
    }

    // Step 4: Log results
    if (errors.length > 0) {
      this.logger.error(
        `❌ Configuration validation failed with ${errors.length} error(s):`,
      );
      errors.forEach((error) => this.logger.error(`  - ${error}`));
    } else {
      this.logger.log(`✅ Configuration validation passed`);
    }

    if (warnings.length > 0) {
      this.logger.warn(
        `⚠️  Configuration validation has ${warnings.length} warning(s):`,
      );
      warnings.forEach((warning) => this.logger.warn(`  - ${warning}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedConfig,
    };
  }

  private validateRule(
    rule: ValidationRule,
    value: any,
  ): { isValid: boolean; error?: string; value?: any } {
    // Handle undefined values
    if (value === undefined || value === null) {
      if (rule.required) {
        return { isValid: false, error: 'Required but not set' };
      }
      return { isValid: true, value: rule.defaultValue };
    }

    // Type validation
    if (rule.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return { isValid: false, error: `Must be a number, got: ${value}` };
      }
      value = numValue;
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') {
        const lowerValue = String(value).toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1') {
          value = true;
        } else if (lowerValue === 'false' || lowerValue === '0') {
          value = false;
        } else {
          return { isValid: false, error: `Must be a boolean, got: ${value}` };
        }
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          isValid: false,
          error: `Minimum length ${rule.minLength}, got: ${value.length}`,
        };
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          isValid: false,
          error: `Maximum length ${rule.maxLength}, got: ${value.length}`,
        };
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return { isValid: false, error: `Must match pattern: ${rule.pattern}` };
      }
    }

    return { isValid: true, value };
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      // Use Prisma's health check
      const health = await this.prismaService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error('Database health check failed');
      }

      // Additional validation: Check if we can query a simple table
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(`Database validation failed: ${error.message}`);
    }
  }

  /**
   * Get validated configuration (safe to use after validation)
   */
  getValidatedConfig(): Record<string, any> {
    const config: Record<string, any> = {};

    for (const rule of this.validationRules) {
      const value = this.configService.get(rule.key);
      if (value !== undefined && value !== null) {
        config[rule.key] = value;
      } else if (rule.defaultValue !== undefined) {
        config[rule.key] = rule.defaultValue;
      }
    }

    return config;
  }

  /**
   * Quick validation for CI/CD environments
   */
  async validateForCi(): Promise<boolean> {
    const result = await this.validate();

    if (!result.isValid) {
      console.error('CI/CD Configuration validation failed:');
      result.errors.forEach((error) => console.error(`  - ${error}`));
      return false;
    }

    return true;
  }
}
