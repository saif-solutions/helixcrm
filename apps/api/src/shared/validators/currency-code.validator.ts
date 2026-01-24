import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

// ISO 4217 Currency Codes - Enterprise subset
const SUPPORTED_CURRENCIES = new Set([
  // Major currencies
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'HKD',
  // BRICS & major emerging
  'INR', 'BRL', 'RUB', 'ZAR', 'MXN', 'KRW', 'TRY', 'IDR',
  // European
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  // Middle East & Africa
  'AED', 'SAR', 'QAR', 'EGP', 'NGN',
  // Asia Pacific
  'SGD', 'NZD', 'THB', 'MYR', 'PHP', 'VND', 'BDT', 'PKR',
]);

@ValidatorConstraint({ name: 'CurrencyCodeConstraint', async: false })
@Injectable()
export class CurrencyCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    // Allow undefined/empty (field is optional)
    if (!value || value.trim() === '') {
      return true;
    }

    const currency = value.toUpperCase();
    
    // Validate format: exactly 3 uppercase letters
    if (!/^[A-Z]{3}$/.test(currency)) {
      return false;
    }
    
    // Validate against supported currencies
    return SUPPORTED_CURRENCIES.has(currency);
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    
    if (!value) {
      return 'Currency code cannot be empty';
    }
    
    if (!/^[A-Z]{3}$/i.test(value)) {
      return `Currency code must be exactly 3 letters (received: "${value}")`;
    }
    
    const currency = value.toUpperCase();
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      const supported = Array.from(SUPPORTED_CURRENCIES)
        .sort()
        .join(', ');
      return `Unsupported currency code: "${value}". Supported currencies: ${supported}`;
    }
    
    return `Invalid currency code: "${value}"`;
  }
}

export function IsValidCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
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

// Optional: Export for testing and reuse
export const CURRENCY_VALIDATION = {
  regex: /^[A-Z]{3}$/,
  supported: SUPPORTED_CURRENCIES,
  isValid: (code: string): boolean => {
    if (!code) return false;
    const normalized = code.toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) && SUPPORTED_CURRENCIES.has(normalized);
  },
  normalize: (code: string): string | null => {
    if (!code) return null;
    const normalized = code.toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) && SUPPORTED_CURRENCIES.has(normalized) 
      ? normalized 
      : null;
  },
};