// apps/api/src/shared/validators/currency-code.validator.ts

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

// ISO 4217 Currency Codes - Enterprise subset
const SUPPORTED_CURRENCIES = new Set<string>([
  // Major currencies
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'CHF',
  'HKD',
  // BRICS & major emerging
  'INR',
  'BRL',
  'RUB',
  'ZAR',
  'MXN',
  'KRW',
  'TRY',
  'IDR',
  // European
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  // Middle East & Africa
  'AED',
  'SAR',
  'QAR',
  'EGP',
  'NGN',
  // Asia Pacific
  'SGD',
  'NZD',
  'THB',
  'MYR',
  'PHP',
  'VND',
  'BDT',
  'PKR',
]);

// ==================== TYPE GUARDS ====================

/**
 * Type guard for string
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for boolean
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for Date
 */
function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely convert unknown value to string without object default toString
 * Returns a human-readable representation for error messages
 */
function safeStringify(value: unknown): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle strings
  if (isString(value)) {
    return value;
  }

  // Handle numbers
  if (isNumber(value)) {
    return value.toString();
  }

  // Handle booleans
  if (isBoolean(value)) {
    return value ? 'true' : 'false';
  }

  // Handle Dates
  if (isDate(value)) {
    return value.toISOString();
  }

  // Handle objects - NEVER use String() on objects
  if (typeof value === 'object') {
    try {
      const jsonString = JSON.stringify(value);
      if (jsonString && jsonString !== '{}' && jsonString !== '[]') {
        return jsonString;
      }
    } catch {
      // JSON.stringify failed
    }
    // Return the constructor name
    const obj = value as Record<string, unknown>;
    const constructorName = obj.constructor?.name;
    if (constructorName) {
      return `[${constructorName}]`;
    }
    return '[Object]';
  }

  // For symbol, bigint, and any other types
  // Use a safe fallback that doesn't call String() on objects
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  // Final fallback - use the type name
  return `[${typeof value}]`;
}

/**
 * Extract currency code string from unknown value
 */
function extractCurrencyCode(value: unknown): {
  isValid: boolean;
  code: string | null;
  rawString: string;
} {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { isValid: false, code: null, rawString: '' };
  }

  // Handle non-string values
  if (!isString(value)) {
    return { isValid: false, code: null, rawString: safeStringify(value) };
  }

  const trimmed = value.trim();

  // Handle empty string
  if (trimmed === '') {
    return { isValid: false, code: null, rawString: '' };
  }

  const upperCode = trimmed.toUpperCase();

  // Validate format
  if (!/^[A-Z]{3}$/.test(upperCode)) {
    return { isValid: false, code: null, rawString: trimmed };
  }

  // Validate against supported currencies
  const isValid = SUPPORTED_CURRENCIES.has(upperCode);

  return {
    isValid,
    code: isValid ? upperCode : null,
    rawString: trimmed,
  };
}

// ==================== VALIDATOR ====================

/**
 * Currency Code Validation Constraint
 * Validates that a currency code is a valid ISO 4217 3-letter code
 * from the supported enterprise list
 */
@ValidatorConstraint({ name: 'CurrencyCodeConstraint', async: false })
@Injectable()
export class CurrencyCodeConstraint implements ValidatorConstraintInterface {
  /**
   * Validate currency code
   * @param value - The currency code to validate
   * @param _validationArguments - Validation arguments (unused)
   * @returns True if valid, false otherwise
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(value: unknown, _validationArguments: ValidationArguments): boolean {
    // Allow undefined/empty (field is optional)
    if (value === null || value === undefined) {
      return true;
    }

    // Must be a string
    if (!isString(value)) {
      return false;
    }

    const trimmed = value.trim();

    // Empty string is considered optional (passes validation)
    if (trimmed === '') {
      return true;
    }

    const upperCode = trimmed.toUpperCase();

    // Validate format and supported currencies
    return /^[A-Z]{3}$/.test(upperCode) && SUPPORTED_CURRENCIES.has(upperCode);
  }

  /**
   * Default error message when validation fails
   */
  defaultMessage(args: ValidationArguments): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = args.value;
    const extracted = extractCurrencyCode(value);

    // Handle empty value
    if (value === null || value === undefined) {
      return 'Currency code cannot be empty';
    }

    // Handle non-string
    if (!isString(value)) {
      return `Currency code must be a string (received: ${extracted.rawString})`;
    }

    // Handle empty string
    if (extracted.rawString === '') {
      return 'Currency code cannot be empty';
    }

    // Handle invalid format
    if (!/^[A-Z]{3}$/i.test(extracted.rawString)) {
      return `Currency code must be exactly 3 letters (received: "${extracted.rawString}")`;
    }

    // Handle unsupported currency
    if (!extracted.isValid) {
      const supported = Array.from(SUPPORTED_CURRENCIES).sort().join(', ');
      return `Unsupported currency code: "${extracted.rawString}". Supported currencies: ${supported}`;
    }

    return `Invalid currency code: "${extracted.rawString}"`;
  }
}

/**
 * Decorator factory for validating ISO 4217 currency codes
 * @param validationOptions - Validation options for class-validator
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class CreateDealDto {
 *   @IsValidCurrencyCode()
 *   currencyCode: string;
 * }
 * ```
 */
export function IsValidCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        ...validationOptions,
        message: validationOptions?.message || 'Invalid currency code format',
      },
      constraints: [],
      validator: CurrencyCodeConstraint,
    });
  };
}

/**
 * Currency validation utilities for testing and reuse
 */
export const CURRENCY_VALIDATION = {
  regex: /^[A-Z]{3}$/,
  supported: SUPPORTED_CURRENCIES,
  /**
   * Check if a currency code is valid
   */
  isValid: (code: unknown): boolean => {
    if (!code) return false;
    if (!isString(code)) return false;
    const trimmed = code.trim();
    if (trimmed === '') return false;
    const normalized = trimmed.toUpperCase();
    return (
      /^[A-Z]{3}$/.test(normalized) && SUPPORTED_CURRENCIES.has(normalized)
    );
  },
  /**
   * Normalize a currency code to uppercase 3-letter format
   */
  normalize: (code: unknown): string | null => {
    if (!code) return null;
    if (!isString(code)) return null;
    const trimmed = code.trim();
    if (trimmed === '') return null;
    const normalized = trimmed.toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) && SUPPORTED_CURRENCIES.has(normalized)
      ? normalized
      : null;
  },
};
