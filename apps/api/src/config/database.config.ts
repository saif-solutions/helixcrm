// apps/api/src/config/database.config.ts

export interface DatabaseConfig {
  database: {
    url: string;
    ssl: boolean;
    poolSize: number;
    connectionTimeout: number;
    idleTimeout: number;
    maxQueryExecutionTime: number;
    logQueries: boolean;
    // Additional options
    sslCert?: string;
    sslKey?: string;
    sslCa?: string;
    poolMin?: number;
    poolMax?: number;
    poolAcquireTimeout?: number;
    statementTimeout?: number;
    applicationName?: string;
    retry: {
      maxRetries: number;
      retryDelay: number;
      exponentialBackoff: boolean;
    };
    monitoring: {
      enabled: boolean;
      slowQueryThreshold: number;
      logPoolStats: boolean;
    };
  };
}

export default (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    database: {
      url: process.env.DATABASE_URL || '',
      ssl: process.env.DB_SSL === 'true',
      poolSize: parseInt(
        process.env.DB_POOL_SIZE || (isProduction ? '20' : '5'),
        10,
      ),
      connectionTimeout: parseInt(
        process.env.DB_CONNECTION_TIMEOUT || '30000',
        10,
      ),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),
      maxQueryExecutionTime: parseInt(
        process.env.DB_MAX_QUERY_TIME || '5000',
        10,
      ),
      logQueries: process.env.NODE_ENV === 'development',
      // SSL certificate paths for secure connections
      sslCert: process.env.DB_SSL_CERT,
      sslKey: process.env.DB_SSL_KEY,
      sslCa: process.env.DB_SSL_CA,
      poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
      poolMax: parseInt(
        process.env.DB_POOL_MAX || (isProduction ? '20' : '10'),
        10,
      ),
      poolAcquireTimeout: parseInt(
        process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000',
        10,
      ),
      statementTimeout: parseInt(
        process.env.DB_STATEMENT_TIMEOUT || '30000',
        10,
      ),
      applicationName: process.env.DB_APPLICATION_NAME || 'helix-crm-api',
      retry: {
        maxRetries: parseInt(process.env.DB_RETRY_MAX || '3', 10),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000', 10),
        exponentialBackoff: process.env.DB_RETRY_EXPONENTIAL !== 'false',
      },
      monitoring: {
        enabled: process.env.DB_MONITORING_ENABLED === 'true',
        slowQueryThreshold: parseInt(
          process.env.DB_SLOW_QUERY_THRESHOLD || '1000',
          10,
        ),
        logPoolStats: process.env.DB_LOG_POOL_STATS === 'true',
      },
    },
  };
};
