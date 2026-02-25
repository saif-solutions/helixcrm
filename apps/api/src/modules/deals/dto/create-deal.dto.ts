import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount cannot be negative' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string = 'USD';

  @IsOptional()
  @IsEnum(['open', 'won', 'lost'], {
    message: 'Status must be open, won, or lost',
  })
  status?: string = 'open';

  @IsOptional()
  @IsNumber({}, { message: 'Probability must be a number' })
  @Min(0, { message: 'Probability must be at least 0' })
  @Max(100, { message: 'Probability cannot exceed 100' })
  @Type(() => Number)
  probability?: number = 0;

  @IsOptional()
  @IsDateString({}, { message: 'Expected close date must be a valid date' })
  expectedCloseDate?: string;

  @IsString({ message: 'Pipeline ID must be a string' })
  @IsUUID('4', { message: 'Pipeline ID must be a valid UUID' })
  pipelineId: string;

  @IsString({ message: 'Stage ID must be a string' })
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
  @IsString({ message: 'Owner User ID must be a string' })
  @IsUUID('4', { message: 'Owner User ID must be a valid UUID' })
  ownerUserId?: string;

  @IsOptional()
  metadata?: any;
}
