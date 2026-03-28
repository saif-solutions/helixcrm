// apps/api/src/config/demo.config.ts
export interface DemoConfig {
  enabled: boolean;
  adminEmail: string;
  adminPassword: string;
  userEmail: string;
  userPassword: string;
}

export default (): DemoConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Only enable demo in non-production or if explicitly allowed
    enabled: !isProduction || process.env.ALLOW_DEMO === 'true',

    // These come from environment variables, never hardcoded
    adminEmail: process.env.DEMO_ADMIN_EMAIL || 'test@helixcrm.com',
    adminPassword: process.env.DEMO_ADMIN_PASSWORD || 'Test123!',
    userEmail: process.env.DEMO_USER_EMAIL || 'user@helixcrm.com',
    userPassword: process.env.DEMO_USER_PASSWORD || 'User123!',
  };
};
