// apps/api/src/shared/utils/type-guards.ts

/**
 * Type guard utilities for runtime type safety
 */

/**
 * Type guard to check if a value is a Record (plain object)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Safely get string representation of a value
 * Production-hardened version with proper type safety
 */
function getStringRepresentation(value: unknown, maxLength = 1000): string {
  // Handle primitives
  if (isString(value)) return value.slice(0, maxLength);
  if (isNumber(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  // Handle arrays
  if (Array.isArray(value)) {
    try {
      const jsonResult = JSON.stringify(value);
      if (jsonResult && jsonResult !== '[]') {
        return jsonResult.slice(0, maxLength);
      }
      return '[Array]';
    } catch {
      return '[Array]';
    }
  }

  // Handle objects safely - use Object.prototype.toString to avoid unsafe custom toString
  if (value && typeof value === 'object') {
    try {
      // Use Object.prototype.toString for safe string representation
      // Cast to unknown first to avoid unsafe assignment
      const toStringResult: unknown = Object.prototype.toString.call(value);
      if (
        typeof toStringResult === 'string' &&
        toStringResult !== '[object Object]'
      ) {
        return toStringResult.slice(0, maxLength);
      }
    } catch {
      // Fall through to JSON serialization
    }

    // Safe JSON serialization
    try {
      const jsonResult = JSON.stringify(value);
      if (jsonResult && jsonResult !== '{}' && jsonResult !== '[]') {
        return jsonResult.slice(0, maxLength);
      }
    } catch {
      // Fall through to default
    }
  }

  return '[object Object]';
}

/**
 * Convert unknown value to safe Record
 */
export function toSafeRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/**
 * Type guard for Prisma JsonValue
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

/**
 * Safely extract number from unknown value (for Decimal conversion)
 */
export function toSafeNumber(value: unknown, defaultValue = 0): number {
  if (isNumber(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // Check if value is an object with numeric value (like Prisma Decimal)
  if (value && typeof value === 'object') {
    try {
      // Try to get numeric value safely
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    } catch {
      // Fall through to default
    }
  }

  return defaultValue;
}

/**
 * Safely extract string from unknown value
 * Production-hardened with max length protection
 */
export function toSafeString(
  value: unknown,
  defaultValue = '',
  maxLength = 1000,
): string {
  if (isString(value)) return value.slice(0, maxLength);
  if (typeof value === 'number') return String(value).slice(0, maxLength);
  if (typeof value === 'boolean') return String(value).slice(0, maxLength);
  if (value === null) return defaultValue;
  if (value === undefined) return defaultValue;

  // Use the safe string representation function
  const stringValue = getStringRepresentation(value, maxLength);

  // Avoid [object Object] - if we get that, try JSON.stringify as fallback
  if (stringValue === '[object Object]') {
    try {
      const jsonString = JSON.stringify(value);
      if (jsonString && jsonString !== '{}') {
        return jsonString.slice(0, maxLength);
      }
    } catch {
      // Fall through to default
    }
    return defaultValue;
  }

  return stringValue;
}

/**
 * Type guard for DealWithRelations (if needed in services)
 */
export interface DealWithRelations {
  id: string;
  pipeline: unknown;
  stage: unknown;
  owner: unknown;
  [key: string]: unknown;
}

export function isDealWithRelations(deal: unknown): deal is DealWithRelations {
  return (
    isRecord(deal) &&
    'id' in deal &&
    'pipeline' in deal &&
    'stage' in deal &&
    'owner' in deal
  );
}

/**
 * Type guard for arrays
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for non-null
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safe JSON parse with runtime type safety
 * Uses unknown boundary to avoid unsafe any assignment
 */
export function safeJsonParse<T = unknown>(value: string, defaultValue: T): T {
  try {
    // Parse to unknown first to avoid unsafe any assignment
    const parsed: unknown = JSON.parse(value);
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe JSON stringify with bigint and circular reference protection
 * Properly typed replacer function
 */
export function safeJsonStringify(
  value: unknown,
  defaultValue = '{}',
  maxLength = 1000,
): string {
  try {
    const result = JSON.stringify(value, (_key: string, v: unknown) => {
      // Handle bigint safely
      if (typeof v === 'bigint') {
        return v.toString();
      }
      // Handle circular references by returning the object as-is
      if (typeof v === 'object' && v !== null) {
        return v;
      }
      return v;
    });
    return (result || defaultValue).slice(0, maxLength);
  } catch {
    return defaultValue;
  }
}

/**
 * Type guard for Prisma Decimal (or any numeric object)
 */
export function isDecimalLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  try {
    const valueAsRecord = value as Record<string, unknown>;
    // Direct check without extracting method reference
    return typeof valueAsRecord.toNumber === 'function';
  } catch {
    return false;
  }
}

/**
 * Safely convert Prisma Decimal to number
 */
export function decimalToNumber(value: unknown, defaultValue = 0): number {
  if (isNumber(value)) return value;

  if (isDecimalLike(value)) {
    try {
      const valueAsRecord = value as { toNumber(): number };
      return valueAsRecord.toNumber();
    } catch {
      return defaultValue;
    }
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  if (value && typeof value === 'object') {
    try {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    } catch {
      // Fall through to default
    }
  }

  return defaultValue;
}

/**
 * Type guard for object with specific property
 */
export function hasProperty<K extends PropertyKey>(
  value: unknown,
  property: K,
): value is Record<K, unknown> {
  return isRecord(value) && property in value;
}

/**
 * Type guard for object with string property
 */
export function hasStringProperty(
  value: unknown,
  property: string,
): value is Record<string, string> {
  return isRecord(value) && property in value && isString(value[property]);
}

/**
 * Type guard for object with number property
 */
export function hasNumberProperty(
  value: unknown,
  property: string,
): value is Record<string, number> {
  return isRecord(value) && property in value && isNumber(value[property]);
}

/**
 * Safe string truncation for logging
 */
export function truncateString(
  value: string,
  maxLength = 1000,
  suffix = '...',
): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - suffix.length) + suffix;
}
