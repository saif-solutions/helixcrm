// apps/api/src/config/index.ts

import appConfig from './app.config';
import databaseConfig from './database.config';
import authConfig from './auth.config';
import securityConfig from './security.config';
import demoConfig from './demo.config';

export { appConfig, databaseConfig, authConfig, securityConfig, demoConfig };

export * from './validation/config-validation.module';
export * from './validation/config-validation.service';
