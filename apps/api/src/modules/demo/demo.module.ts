// apps/api/src/modules/demo/demo.module.ts
import { Module, DynamicModule, Logger } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { AuthModule } from '../auth/auth.module';
import getDemoConfig from '../../config/demo.config';

/**
 * Demo Module
 *
 * Provides demo endpoints for quick testing and onboarding.
 * This module is **conditionally loaded** based on the demo configuration.
 * It should never be active in production unless explicitly allowed.
 *
 * @example
 * // In app.module.ts
 * imports: [
 *   // ... other modules
 *   ...(DemoModule.register() ? [DemoModule.register()] : []),
 * ]
 */
@Module({})
export class DemoModule {
  private static readonly logger = new Logger(DemoModule.name);

  /**
   * Conditionally register the demo module.
   *
   * If demo mode is enabled (via configuration), the module is registered
   * with its controller and required imports. Otherwise, nothing is returned,
   * effectively disabling the module.
   *
   * @returns A DynamicModule if demo is enabled, otherwise undefined.
   */
  static register(): DynamicModule | undefined {
    const config = getDemoConfig();

    if (!config.enabled) {
      this.logger.log('Demo module is disabled – skipping registration');
      return undefined;
    }

    this.logger.log('Demo module is enabled – registering endpoints');
    return {
      module: DemoModule,
      imports: [AuthModule],
      controllers: [DemoController],
    };
  }
}
