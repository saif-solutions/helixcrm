import { SetMetadata, CustomDecorator } from '@nestjs/common';

/**
 * Entity type options for validation
 */
export type EntityType =
  | 'user'
  | 'deal'
  | 'contact'
  | 'pipeline'
  | 'stage'
  | 'activity'
  | 'note'
  | 'task'
  | 'attachment'
  | 'comment'
  | 'organization'
  | 'tenant';

/**
 * Validation options for entity existence
 */
export interface ValidateEntityExistsOptions {
  /**
   * Type of entity to validate
   */
  entityType: EntityType;

  /**
   * Optional custom error message
   * @example 'The specified deal does not exist or you do not have access to it.'
   */
  errorMessage?: string;

  /**
   * Whether to include soft-deleted entities in the check
   * @default false
   */
  includeDeleted?: boolean;

  /**
   * Whether to check tenant isolation
   * @default true
   */
  checkTenantIsolation?: boolean;

  /**
   * Custom field name for entity ID parameter
   * @default 'id'
   */
  idParam?: string;
}

/**
 * Metadata key for entity validation
 */
export const VALIDATE_ENTITY_EXISTS_KEY = 'validate-entity-exists';

/**
 * Decorator to validate that an entity exists before executing the route
 *
 * @param entityType - Type of entity to validate (string or options object)
 * @returns Custom decorator with validation metadata
 *
 * @example
 * ```typescript
 * // Basic usage
 * @ValidateEntityExists('deal')
 * @Get(':id')
 * getDeal(@Param('id') id: string) { ... }
 *
 * // Advanced usage with options
 * @ValidateEntityExists({
 *   entityType: 'deal',
 *   includeDeleted: true,
 *   errorMessage: 'Deal not found or has been archived'
 * })
 * @Get(':id')
 * getDeal(@Param('id') id: string) { ... }
 *
 * // With custom ID parameter
 * @ValidateEntityExists({
 *   entityType: 'contact',
 *   idParam: 'contactId'
 * })
 * @Get('contact/:contactId')
 * getContact(@Param('contactId') contactId: string) { ... }
 * ```
 */
export const ValidateEntityExists = (
  entityType: EntityType | ValidateEntityExistsOptions,
): CustomDecorator<string> => {
  // Normalize options
  let options: ValidateEntityExistsOptions;

  if (typeof entityType === 'string') {
    // Simple string usage
    options = {
      entityType,
      includeDeleted: false,
      checkTenantIsolation: true,
      idParam: 'id',
    };
  } else {
    // Object usage with validation
    options = entityType;

    // Validate in development
    if (process.env.NODE_ENV !== 'production') {
      if (!options.entityType) {
        throw new Error('ValidateEntityExists: entityType is required');
      }

      if (options.idParam && typeof options.idParam !== 'string') {
        throw new Error(
          `ValidateEntityExists: idParam must be a string, got ${typeof options.idParam}`,
        );
      }

      if (options.errorMessage && typeof options.errorMessage !== 'string') {
        throw new Error(
          `ValidateEntityExists: errorMessage must be a string, got ${typeof options.errorMessage}`,
        );
      }

      if (
        options.includeDeleted !== undefined &&
        typeof options.includeDeleted !== 'boolean'
      ) {
        throw new Error(
          `ValidateEntityExists: includeDeleted must be a boolean, got ${typeof options.includeDeleted}`,
        );
      }

      if (
        options.checkTenantIsolation !== undefined &&
        typeof options.checkTenantIsolation !== 'boolean'
      ) {
        throw new Error(
          `ValidateEntityExists: checkTenantIsolation must be a boolean, got ${typeof options.checkTenantIsolation}`,
        );
      }
    }

    // Set defaults for missing fields
    options = {
      includeDeleted: false,
      checkTenantIsolation: true,
      idParam: 'id',
      ...options,
    };
  }

  // Store as metadata
  return SetMetadata(VALIDATE_ENTITY_EXISTS_KEY, options);
};

/**
 * Helper decorator for validating soft-deletable entities
 * Includes soft-deleted entities in the check
 *
 * @param entityType - Type of entity to validate
 * @returns Custom decorator with validation metadata
 *
 * @example
 * ```typescript
 * @ValidateEntityExistsWithDeleted('deal')
 * @Get('archived/:id')
 * getArchivedDeal(@Param('id') id: string) { ... }
 * ```
 */
export const ValidateEntityExistsWithDeleted = (
  entityType: EntityType,
): CustomDecorator<string> => {
  return ValidateEntityExists({
    entityType,
    includeDeleted: true,
    errorMessage: `The specified ${entityType} does not exist or has been permanently deleted.`,
  });
};

/**
 * Helper decorator for validating entities without tenant isolation check
 * Useful for system-level operations
 *
 * @param entityType - Type of entity to validate
 * @returns Custom decorator with validation metadata
 *
 * @example
 * ```typescript
 * @ValidateEntityExistsSystem('organization')
 * @Get('system/organizations/:id')
 * getSystemOrganization(@Param('id') id: string) { ... }
 * ```
 */
export const ValidateEntityExistsSystem = (
  entityType: EntityType,
): CustomDecorator<string> => {
  return ValidateEntityExists({
    entityType,
    checkTenantIsolation: false,
    errorMessage: `The specified ${entityType} does not exist in the system.`,
  });
};

/**
 * Helper decorator for validating entities with custom ID parameter
 *
 * @param entityType - Type of entity to validate
 * @param idParam - Name of the ID parameter in the route
 * @returns Custom decorator with validation metadata
 *
 * @example
 * ```typescript
 * @ValidateEntityExistsWithCustomId('deal', 'dealId')
 * @Get('deals/:dealId')
 * getDeal(@Param('dealId') dealId: string) { ... }
 * ```
 */
export const ValidateEntityExistsWithCustomId = (
  entityType: EntityType,
  idParam: string,
): CustomDecorator<string> => {
  return ValidateEntityExists({
    entityType,
    idParam,
    errorMessage: `The specified ${entityType} does not exist.`,
  });
};

/**
 * Type guard to check if options are the extended format
 */
export const isExtendedEntityOptions = (
  options: EntityType | ValidateEntityExistsOptions,
): options is ValidateEntityExistsOptions => {
  return typeof options === 'object' && 'entityType' in options;
};
