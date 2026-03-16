// packages/prisma-types/index.ts

// Import everything from Prisma client
import * as PrismaClient from '@prisma/client';

// Re-export everything from Prisma client
export * from '@prisma/client';

// Export the $Enums namespace - this is the correct way
export import $Enums = PrismaClient.$Enums;

// Export specific enum types
export type AuditAction = PrismaClient.$Enums.AuditAction;
export type AuditEntityType = PrismaClient.$Enums.AuditEntityType;
export type AuditSeverity = PrismaClient.$Enums.AuditSeverity;

// Export model types - these are accessed through Prisma namespace
export type Webhook = PrismaClient.Prisma.WebhookGetPayload<{}>;
export type WebhookDelivery = PrismaClient.Prisma.WebhookDeliveryGetPayload<{}>;
export type { Prisma } from '@prisma/client';