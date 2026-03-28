// apps/api/src/config/app.config.ts

export interface AppConfig {
  app: {
    name: string;
    port: number;
    environment: 'development' | 'production' | 'test';
    version: string;
    apiPrefix: string;
    cors: {
      origin: string[];
      credentials: boolean;
      methods: string[];
      allowedHeaders: string[];
      exposedHeaders?: string[];
      maxAge?: number;
    };
    bodyParser: {
      limit: string;
      jsonLimit?: string;
      urlencodedLimit?: string;
    };
    compression?: {
      enabled: boolean;
      threshold?: number;
    };
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      format: 'json' | 'text';
      directory: string;
    };
    shutdown: {
      timeout: number;
      gracefulShutdown: boolean;
    };
  };
}

export default (): AppConfig => {
  const environment = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';

  return {
    app: {
      name: process.env.APP_NAME || 'HelixCRM API',
      port: parseInt(process.env.PORT || '3001', 10),
      environment,
      version: process.env.APP_VERSION || '1.0.0',
      apiPrefix: process.env.API_PREFIX || 'api',
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:5173',
          'http://localhost:3000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-CSRF-Token',
          'X-Organization-Id',
          'X-Request-ID',
          'X-Correlation-ID',
        ],
        exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
        maxAge: 86400, // 24 hours in seconds
      },
      bodyParser: {
        limit: process.env.BODY_LIMIT || '10mb',
        jsonLimit: process.env.JSON_BODY_LIMIT || '10mb',
        urlencodedLimit: process.env.URLENCODED_BODY_LIMIT || '10mb',
      },
      compression: {
        enabled: process.env.COMPRESSION_ENABLED !== 'false',
        threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10), // 1KB
      },
      logging: {
        level: (process.env.LOG_LEVEL ||
          (environment === 'production' ? 'info' : 'debug')) as
          | 'debug'
          | 'info'
          | 'warn'
          | 'error',
        format: (process.env.LOG_FORMAT ||
          (environment === 'production' ? 'json' : 'text')) as 'json' | 'text',
        directory: process.env.LOG_DIRECTORY || './logs',
      },
      shutdown: {
        timeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10), // 10 seconds
        gracefulShutdown: process.env.GRACEFUL_SHUTDOWN !== 'false',
      },
    },
  };
};
