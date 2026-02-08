import { SetMetadata } from '@nestjs/common';

export const ValidateEntityExists = (entityType: string) =>
  SetMetadata('validate-entity-exists', entityType);
