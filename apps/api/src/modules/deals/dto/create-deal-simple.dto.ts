import { IsString, IsOptional, IsNumber, IsNotEmpty, Min, MaxLength, IsUUID } from "class-validator";
import { Type } from "class-transformer";

export class CreateDealSimpleDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title: string;

  @IsNumber({}, { message: 'Value must be a number' })
  @Min(0, { message: 'Value cannot be negative' })
  @Type(() => Number)
  value: number;

  @IsString({ message: 'Stage ID must be a string' })
  @IsNotEmpty({ message: 'Stage is required' })
  @IsUUID('4', { message: 'Stage ID must be a valid UUID' })
  stageId: string;

  @IsOptional()
  @IsString({ message: 'Contact ID must be a string' })
  @IsUUID('4', { message: 'Contact ID must be a valid UUID' })
  contactId?: string;

  @IsOptional()
  @IsString({ message: 'Account ID must be a string' })
  @IsUUID('4', { message: 'Account ID must be a valid UUID' })
  accountId?: string;

  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string = 'USD';

  @IsOptional()
  @IsString({ message: 'Owner ID must be a string' })
  @IsUUID('4', { message: 'Owner ID must be a valid UUID' })
  ownerUserId?: string;
}