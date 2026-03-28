// apps/api/src/shared/validators/date-range.validator.ts

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

// ==================== TYPE GUARDS ====================

/**
 * Type guard for valid date
 */
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Convert unknown value to Date object if possible
 */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : null;
  }
  return null;
}

/**
 * Safely convert value to string for error messages without using String() on objects
 */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
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
  // For symbol, bigint, etc.
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }
  // Final fallback - return the type name
  return `[${typeof value}]`;
}

// ==================== VALIDATOR ====================

/**
 * Date range validation constraint
 * Ensures that endDate is greater than or equal to startDate
 */
@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeConstraint implements ValidatorConstraintInterface {
  /**
   * Validate that endDate is >= startDate
   * @param value - The endDate value to validate
   * @param args - Validation arguments containing the object with startDate
   * @returns true if valid, false otherwise
   */
  validate(value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;

    // Extract startDate from the object
    const startDateValue = obj.startDate;
    const endDateValue = value;

    // If either date is missing, validation passes (they're optional)
    if (startDateValue === null || startDateValue === undefined) {
      return true;
    }
    if (endDateValue === null || endDateValue === undefined) {
      return true;
    }

    // Convert to Date objects
    const startDate = toDate(startDateValue);
    const endDate = toDate(endDateValue);

    // If either date is invalid, validation fails
    if (!startDate || !endDate) {
      return false;
    }

    // Ensure startDate <= endDate
    return startDate.getTime() <= endDate.getTime();
  }

  /**
   * Default error message when validation fails
   */
  defaultMessage(args: ValidationArguments): string {
    // Type-safe access to args.object
    const obj = args.object as Record<string, unknown>;
    const startDateValue = obj.startDate;
    // args.value is typed as any by class-validator, but we know it's the endDate value
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const endDateValue = args.value;

    // Convert to strings for error message
    const startDateStr = safeStringify(startDateValue);
    const endDateStr = safeStringify(endDateValue);

    // Check if dates are missing
    if (!startDateValue && !endDateValue) {
      return 'Both startDate and endDate are required for range validation';
    }
    if (!startDateValue) {
      return 'startDate is required for date range validation';
    }
    if (!endDateValue) {
      return 'endDate is required for date range validation';
    }

    // Check if dates are valid
    const startDate = toDate(startDateValue);
    const endDate = toDate(endDateValue);

    if (!startDate && !endDate) {
      return `Invalid date values: startDate="${startDateStr}", endDate="${endDateStr}"`;
    }
    if (!startDate) {
      return `Invalid startDate: "${startDateStr}"`;
    }
    if (!endDate) {
      return `Invalid endDate: "${endDateStr}"`;
    }

    // Check date range
    if (startDate.getTime() > endDate.getTime()) {
      return `Date range invalid: startDate (${startDateStr}) must be less than or equal to endDate (${endDateStr})`;
    }

    return `Invalid date range: startDate="${startDateStr}", endDate="${endDateStr}"`;
  }
}

/**
 * Decorator factory for validating date ranges
 * @param validationOptions - Validation options for class-validator
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class DateRangeDto {
 *   @IsDate()
 *   startDate: Date;
 *
 *   @ValidateDateRange()
 *   @IsDate()
 *   endDate: Date;
 * }
 * ```
 */
export function ValidateDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'dateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: DateRangeConstraint,
    });
  };
}
