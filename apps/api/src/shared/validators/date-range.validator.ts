// apps/api/src/shared/validators/date-range.validator.ts

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

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

    // Extract startDate and endDate from the object
    const startDateValue = obj.startDate;
    const endDateValue: unknown = args.value;

    // If either date is missing, validation passes (they're optional)
    if (!startDateValue || !endDateValue) {
      return true;
    }

    try {
      // Convert to Date objects
      const startDate = new Date(startDateValue as string | Date);
      const endDate = new Date(endDateValue as string | Date);

      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }

      // Ensure startDate <= endDate
      return startDate.getTime() <= endDate.getTime();
    } catch {
      return false;
    }
  }

  /**
   * Default error message when validation fails
   */
  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as Record<string, unknown>;
    const startDateValue: unknown = obj.startDate;
    const endDateValue: unknown = args.value;

    // Safely convert unknown values to strings for error message
    const startDateStr = this.safeToString(startDateValue);
    const endDateStr = this.safeToString(endDateValue);

    if (!startDateValue || !endDateValue) {
      return 'Both startDate and endDate are required for range validation';
    }

    return `Date range invalid: startDate (${startDateStr}) must be less than or equal to endDate (${endDateStr})`;
  }

  /**
   * Safely convert unknown value to string for error messages
   */
  private safeToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    // For objects, convert to JSON string instead of using default toString
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object Object]';
      }
    }
    return '';
  }
}

/**
 * Decorator factory for validating date ranges
 * @param validationOptions - Validation options for class-validator
 * @returns Property decorator function
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
