import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'DateRangeConstraint', async: false })
@Injectable()
export class DateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const obj = args.object as any;

    // If either date is missing, validation passes (they're optional)
    if (!obj.startDate || !obj.endDate) {
      return true;
    }

    const startDate = new Date(obj.startDate);
    const endDate = new Date(obj.endDate);

    // Ensure startDate <= endDate
    return startDate <= endDate;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as any;
    return `Date range invalid: startDate (${obj.startDate}) must be less than or equal to endDate (${obj.endDate})`;
  }
}

export function ValidateDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: DateRangeConstraint,
    });
  };
}
