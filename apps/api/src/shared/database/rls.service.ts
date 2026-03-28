import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RLSConfig, TenantContext, RLSError, RLSErrorCode } from './rls.types';

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

@Injectable()
export class RLSService implements OnModuleInit {
  private readonly logger = new Logger(RLSService.name);
  private config: RLSConfig;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.config = {
      enabled: this.configService.get<string>('RLS_ENABLED', 'true') === 'true',
      featureFlag: this.configService.get<string>(
        'RLS_FEATURE_FLAG',
        'rls_enabled',
      ),
      bypassRole: this.configService.get<string>(
        'RLS_BYPASS_ROLE',
        'super_admin',
      ),
    };
  }

  async onModuleInit(): Promise<void> {
    if (this.config.enabled) {
      await this.initializeRLS();
    } else {
      this.logger.warn('RLS is disabled via configuration');
    }
  }

  async initializeRLS(): Promise<void> {
    try {
      this.logger.log('Initializing Row Level Security...');

      const result = await this.prisma.$queryRaw<
        Array<{ tablename: string; rowsecurity: boolean }>
      >`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
          'organizations', 'users', 'contacts', 'accounts', 'leads', 
          'activities', 'deals', 'pipelines', 'pipeline_stages', 
          'roles', 'user_roles', 'refresh_tokens', 'audit_logs', 
          'password_reset_tokens'
        )
      `;

      const tablesWithoutRLS = result.filter((row) => !row.rowsecurity);

      if (tablesWithoutRLS.length > 0) {
        this.logger.warn(
          `RLS not enabled on tables: ${tablesWithoutRLS.map((t) => t.tablename).join(', ')}`,
        );
        await this.enableRLS();
        this.logger.log('RLS enabled successfully');
      } else {
        this.logger.log('RLS is already enabled on all tables');
      }

      await this.verifyPolicies();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to initialize RLS: ${errorMessage}`);
      throw error;
    }
  }

  async enableRLS(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const tables = [
        'organizations',
        'users',
        'contacts',
        'leads',
        'accounts',
        'activities',
        'audit_logs',
        'password_reset_tokens',
        'deals',
        'pipelines',
        'pipeline_stages',
        'deal_stage_history',
        'roles',
        'permissions',
        'role_permissions',
        'user_roles',
        'refresh_tokens',
      ];

      for (const table of tables) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
        );

        try {
          await tx.$executeRawUnsafe(
            `DROP POLICY IF EXISTS "${table}_bypass_policy" ON "${table}";`,
          );
        } catch {
          // Policy might not exist - that's fine
        }

        await tx.$executeRawUnsafe(`
          CREATE POLICY "${table}_bypass_policy" ON "${table}"
          FOR ALL USING (current_setting('app.current_role', true) = 'super_admin')
        `);

        const hasOrgId = await this.tableHasColumn(tx, table, 'organizationId');

        if (hasOrgId) {
          try {
            await tx.$executeRawUnsafe(
              `DROP POLICY IF EXISTS "${table}_isolation_policy" ON "${table}";`,
            );
          } catch {
            // Policy might not exist - that's fine
          }

          await tx.$executeRawUnsafe(`
            CREATE POLICY "${table}_isolation_policy" ON "${table}"
            FOR ALL USING (
              current_setting('app.current_role', true) = 'super_admin' OR
              "organizationId" = current_setting('app.current_organization_id', true)
            )
          `);
        }
      }
    });
  }

  private async tableHasColumn(
    tx: PrismaService,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await tx.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          AND column_name = $2
        ) as exists
      `,
      table,
      column,
    );
    return result[0]?.exists ?? false;
  }

  async disableRLS(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const sqlPath = path.join(
        process.cwd(),
        'prisma',
        'scripts',
        'disable-rls.sql',
      );

      if (!fs.existsSync(sqlPath)) {
        throw new Error(`Disable RLS SQL file not found at: ${sqlPath}`);
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      await this.prisma.$transaction(async (tx) => {
        const statements = sql.split(';').filter((stmt) => stmt.trim());

        for (const statement of statements) {
          if (statement.trim()) {
            await tx.$executeRawUnsafe(statement);
          }
        }
      });

      this.logger.warn('RLS disabled for maintenance');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to disable RLS: ${errorMessage}`);
      throw error;
    }
  }

  async setTenantContext(context: TenantContext): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const { organizationId, userId, role } = context;

    if (!organizationId) {
      throw new RLSError(
        RLSErrorCode.TENANT_CONTEXT_MISSING,
        'Organization ID is required for RLS context',
      );
    }

    try {
      await this.prisma.$executeRaw`
        SELECT set_config('app.current_organization_id', ${organizationId}, true)
      `;

      if (userId) {
        await this.prisma.$executeRaw`
          SELECT set_config('app.current_user_id', ${userId}::text, true)
        `;
      }

      if (role) {
        await this.prisma.$executeRaw`
          SELECT set_config('app.current_role', ${role}, true)
        `;
      }

      this.logger.debug(
        `Tenant context set: organizationId=${organizationId}, userId=${userId}, role=${role}`,
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to set tenant context: ${errorMessage}`);
      throw error;
    }
  }

  async clearTenantContext(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.prisma.$executeRaw`
        SELECT set_config('app.current_organization_id', '', true)
      `;

      await this.prisma.$executeRaw`
        SELECT set_config('app.current_user_id', '', true)
      `;

      await this.prisma.$executeRaw`
        SELECT set_config('app.current_role', '', true)
      `;

      this.logger.debug('Tenant context cleared');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to clear tenant context: ${errorMessage}`);
      throw error;
    }
  }

  async verifyPolicies(): Promise<boolean> {
    try {
      const policies = await this.prisma.$queryRaw<
        Array<{ tablename: string; policyname: string }>
      >`
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN (
          'organizations', 'users', 'contacts', 'accounts', 'leads', 
          'activities', 'deals', 'pipelines', 'pipeline_stages', 
          'roles', 'user_roles', 'refresh_tokens', 'audit_logs', 
          'password_reset_tokens'
        )
        ORDER BY tablename, policyname
      `;

      const expectedTables = [
        'organizations',
        'users',
        'contacts',
        'accounts',
        'leads',
        'activities',
        'deals',
        'pipelines',
        'pipeline_stages',
        'roles',
        'user_roles',
        'refresh_tokens',
        'audit_logs',
        'password_reset_tokens',
      ];

      const policiesByTable = new Map<string, string[]>();
      policies.forEach((policy) => {
        if (!policiesByTable.has(policy.tablename)) {
          policiesByTable.set(policy.tablename, []);
        }
        policiesByTable.get(policy.tablename)?.push(policy.policyname);
      });

      const tablesWithPolicies = Array.from(policiesByTable.keys());
      const missingTables = expectedTables.filter(
        (table) => !tablesWithPolicies.includes(table),
      );

      if (missingTables.length > 0) {
        this.logger.warn(
          `Missing RLS policies for tables: ${missingTables.join(', ')}`,
        );
        return false;
      }

      policiesByTable.forEach((policyNames, tableName) => {
        this.logger.debug(
          `Table ${tableName} has policies: ${policyNames.join(', ')}`,
        );
      });

      this.logger.log(
        `RLS policies verified: ${policies.length} policies across ${tablesWithPolicies.length} tables`,
      );
      return true;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to verify RLS policies: ${errorMessage}`);
      return false;
    }
  }

  async testRLSIsolation(
    organizationId1: string,
    organizationId2: string,
  ): Promise<boolean> {
    try {
      await this.setTenantContext({ organizationId: organizationId1 });
      const org1Count = await this.prisma.user.count();

      await this.setTenantContext({ organizationId: organizationId2 });
      const org2Count = await this.prisma.user.count();

      await this.clearTenantContext();

      this.logger.debug(
        `RLS isolation test: Org1 users=${org1Count}, Org2 users=${org2Count}`,
      );

      return org1Count !== org2Count;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`RLS isolation test failed: ${errorMessage}`);
      return false;
    }
  }

  async healthCheck(): Promise<{
    enabled: boolean;
    policiesConfigured: boolean;
    isolationWorking?: boolean;
  }> {
    try {
      const enabled = this.config.enabled;
      const policiesConfigured = await this.verifyPolicies();

      let isolationWorking: boolean | undefined;
      if (policiesConfigured) {
        const testResult = await this.prisma.$queryRaw<
          Array<{ rls_enabled: boolean }>
        >`
          SELECT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND rowsecurity = true
          ) as rls_enabled
        `;
        isolationWorking = testResult[0]?.rls_enabled ?? false;
      }

      return {
        enabled,
        policiesConfigured,
        isolationWorking,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`RLS health check failed: ${errorMessage}`);
      return {
        enabled: false,
        policiesConfigured: false,
        isolationWorking: false,
      };
    }
  }

  getConfig(): RLSConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async toggleRLS(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;

    if (enabled) {
      await this.enableRLS();
    } else {
      await this.disableRLS();
    }

    this.logger.log(`RLS ${enabled ? 'enabled' : 'disabled'}`);
  }
}
