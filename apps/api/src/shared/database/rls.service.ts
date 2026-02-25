import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RLSConfig, TenantContext, RLSError, RLSErrorCode } from './rls.types';

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

  async onModuleInit() {
    if (this.config.enabled) {
      await this.initializeRLS();
    } else {
      this.logger.warn('RLS is disabled via configuration');
    }
  }

  /**
   * Initialize RLS by enabling it in the database
   */
  async initializeRLS(): Promise<void> {
    try {
      this.logger.log('Initializing Row Level Security...');

      // Check if RLS is already enabled
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

        // Enable RLS on all tables
        await this.enableRLS();
        this.logger.log('RLS enabled successfully');
      } else {
        this.logger.log('RLS is already enabled on all tables');
      }

      // Verify policies exist
      await this.verifyPolicies();
    } catch (error) {
      this.logger.error('Failed to initialize RLS:', error);
      throw error;
    }
  }

  /**
   * Enable RLS by executing the SQL script
   */
  // Update src/shared/database/rls.service.ts - enableRLS method
  async enableRLS() {
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
        // Enable RLS - single statement
        await tx.$executeRawUnsafe(
          `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
        );

        // Drop policy if exists - single statement
        try {
          await tx.$executeRawUnsafe(
            `DROP POLICY IF EXISTS "${table}_bypass_policy" ON "${table}";`,
          );
        } catch (e) {
          // Policy might not exist - that's fine
        }

        // Create bypass policy - single statement
        await tx.$executeRawUnsafe(`
        CREATE POLICY "${table}_bypass_policy" ON "${table}"
        FOR ALL USING (current_setting('app.current_role', true) = 'super_admin')
      `);

        // Check if table has organizationId column
        const hasOrgId = await this.tableHasColumn(tx, table, 'organizationId');

        if (hasOrgId) {
          // Drop isolation policy if exists
          try {
            await tx.$executeRawUnsafe(
              `DROP POLICY IF EXISTS "${table}_isolation_policy" ON "${table}";`,
            );
          } catch (e) {
            // Policy might not exist - that's fine
          }

          // Create isolation policy - single statement
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

  // Add helper method
  private async tableHasColumn(
    tx: any,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await tx.$queryRawUnsafe(
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
    return result[0]?.exists || false;
  }

  /**
   * Disable RLS for maintenance
   */
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

      // Check if file exists
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
    } catch (error) {
      this.logger.error('Failed to disable RLS:', error);
      throw error;
    }
  }

  /**
   * Set tenant context for the current database session
   * IMPORTANT: This must match the setting names in enable-rls.sql
   */
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
      // Set the organization context - MUST MATCH enable-rls.sql policy conditions
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
    } catch (error) {
      this.logger.error('Failed to set tenant context:', error);
      throw error;
    }
  }

  /**
   * Clear tenant context
   */
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
    } catch (error) {
      this.logger.error('Failed to clear tenant context:', error);
      throw error;
    }
  }

  /**
   * Verify RLS policies are correctly configured
   */
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

      // Group policies by table
      const policiesByTable = new Map<string, string[]>();
      policies.forEach((policy) => {
        if (!policiesByTable.has(policy.tablename)) {
          policiesByTable.set(policy.tablename, []);
        }
        policiesByTable.get(policy.tablename).push(policy.policyname);
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

      // Log each table's policies for debugging
      policiesByTable.forEach((policyNames, tableName) => {
        this.logger.debug(
          `Table ${tableName} has policies: ${policyNames.join(', ')}`,
        );
      });

      this.logger.log(
        `RLS policies verified: ${policies.length} policies across ${tablesWithPolicies.length} tables`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to verify RLS policies:', error);
      return false;
    }
  }

  /**
   * Test RLS isolation by checking if data is properly segregated
   */
  async testRLSIsolation(
    organizationId1: string,
    organizationId2: string,
  ): Promise<boolean> {
    try {
      // Set context for organization 1
      await this.setTenantContext({ organizationId: organizationId1 });
      const org1Count = await this.prisma.user.count();

      // Set context for organization 2
      await this.setTenantContext({ organizationId: organizationId2 });
      const org2Count = await this.prisma.user.count();

      // Clear context
      await this.clearTenantContext();

      this.logger.debug(
        `RLS isolation test: Org1 users=${org1Count}, Org2 users=${org2Count}`,
      );

      // If both organizations see the same count, RLS is not working
      return org1Count !== org2Count;
    } catch (error) {
      this.logger.error('RLS isolation test failed:', error);
      return false;
    }
  }

  /**
   * Quick health check for RLS
   */
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
        // Create a quick test to verify RLS is actually working
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
        isolationWorking = testResult[0]?.rls_enabled || false;
      }

      return {
        enabled,
        policiesConfigured,
        isolationWorking,
      };
    } catch (error) {
      this.logger.error('RLS health check failed:', error);
      return {
        enabled: false,
        policiesConfigured: false,
        isolationWorking: false,
      };
    }
  }

  /**
   * Get current RLS configuration
   */
  getConfig(): RLSConfig {
    return { ...this.config };
  }

  /**
   * Check if RLS is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Toggle RLS (for feature flag testing)
   */
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
