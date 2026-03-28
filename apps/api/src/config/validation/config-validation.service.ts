import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface ValidationRule {
  key: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  defaultValue?: unknown;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedConfig: Record<string, unknown>;
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

// Helper function to normalize any thrown value to an Error object with cause
function normalizeError(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

// Helper function to safely convert unknown to string
function safeToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[Object]';
  }
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

  private initializeValidationRules(): void {
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
    const validatedConfig: Record<string, unknown> = {};

    this.logger.log('��� Starting configuration validation...');

    // Step 1: Validate environment variables
    for (const rule of this.validationRules) {
      // Use type assertion to tell TypeScript this is safe
      const value = this.configService.get<
        string | number | boolean | undefined
      >(rule.key);
      const validation = this.validateRule(rule, value);

      if (validation.isValid) {
        validatedConfig[rule.key] = validation.value;
      } else if (rule.required) {
        errors.push(`${rule.key}: ${validation.error}`);
      } else {
        const defaultValueStr = safeToString(rule.defaultValue);
        warnings.push(
          `${rule.key}: ${validation.error} - Using default: ${defaultValueStr}`,
        );
        validatedConfig[rule.key] = rule.defaultValue;
      }
    }

    // Step 2: Validate JWT secrets are different (security best practice)
    const jwtSecret = validatedConfig['JWT_SECRET'] as string | undefined;
    const jwtRefreshSecret = validatedConfig['JWT_REFRESH_SECRET'] as
      | string
      | undefined;

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
      const errorMessage = getErrorMessage(error);
      errors.push(`Database connection failed: ${errorMessage}`);
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
    value: string | number | boolean | undefined,
  ): { isValid: boolean; error?: string; value?: unknown } {
    // Handle undefined values
    if (value === undefined || value === null) {
      if (rule.required) {
        return { isValid: false, error: 'Required but not set' };
      }
      return { isValid: true, value: rule.defaultValue };
    }

    let processedValue: unknown = value;

    // Type validation
    if (rule.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        const valueStr = safeToString(value);
        return { isValid: false, error: `Must be a number, got: ${valueStr}` };
      }
      processedValue = numValue;
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') {
        const lowerValue = safeToString(value).toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1') {
          processedValue = true;
        } else if (lowerValue === 'false' || lowerValue === '0') {
          processedValue = false;
        } else {
          const valueStr = safeToString(value);
          return {
            isValid: false,
            error: `Must be a boolean, got: ${valueStr}`,
          };
        }
      }
    }

    // String validations
    if (typeof processedValue === 'string') {
      if (rule.minLength && processedValue.length < rule.minLength) {
        return {
          isValid: false,
          error: `Minimum length ${rule.minLength}, got: ${processedValue.length}`,
        };
      }

      if (rule.maxLength && processedValue.length > rule.maxLength) {
        return {
          isValid: false,
          error: `Maximum length ${rule.maxLength}, got: ${processedValue.length}`,
        };
      }

      if (rule.pattern && !rule.pattern.test(processedValue)) {
        const patternStr = safeToString(rule.pattern);
        return { isValid: false, error: `Must match pattern: ${patternStr}` };
      }
    }

    return { isValid: true, value: processedValue };
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      // Simple query to verify database connection
      await this.prismaService.$queryRaw`SELECT 1 as result`;
    } catch (error) {
      throw normalizeError(error, 'Database validation failed');
    }
  }

  /**
   * Get validated configuration (safe to use after validation)
   */
  getValidatedConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    for (const rule of this.validationRules) {
      const value = this.configService.get<
        string | number | boolean | undefined
      >(rule.key);
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

  private initializeValidationRules(): void {
    this.validationRules = [
      // Existing rules...

      // Add Redis validation
      {
        key: 'REDIS_HOST',
        required: false,
        type: 'string',
        defaultValue: 'localhost',
        description: 'Redis host for caching and queues',
      },
      {
        key: 'REDIS_PORT',
        required: false,
        type: 'number',
        defaultValue: 6379,
        minValue: 1,
        maxValue: 65535,
        description: 'Redis port',
      },
      {
        key: 'REDIS_PASSWORD',
        required: false,
        type: 'string',
        description: 'Redis password (optional)',
      },

      // Add CSRF validation
      {
        key: 'CSRF_SECRET',
        required: process.env.NODE_ENV === 'production',
        type: 'string',
        minLength: 32,
        description: 'CSRF token secret (min 32 chars)',
      },

      // Add rate limiting
      {
        key: 'THROTTLE_TTL',
        required: false,
        type: 'number',
        defaultValue: 60,
        minValue: 1,
        description: 'Rate limit time window in seconds',
      },
      {
        key: 'THROTTLE_LIMIT',
        required: false,
        type: 'number',
        defaultValue: 100,
        minValue: 1,
        description: 'Maximum requests per time window',
      },

      // Add monitoring
      {
        key: 'SENTRY_DSN',
        required: false,
        type: 'string',
        description: 'Sentry DSN for error tracking',
      },
      {
        key: 'NEW_RELIC_LICENSE_KEY',
        required: false,
        type: 'string',
        description: 'New Relic license key for performance monitoring',
      },
    ];
  }
}
