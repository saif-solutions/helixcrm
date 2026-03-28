// apps/api/src/config/app.config.ts

export default () => ({
  app: {
    name: process.env.APP_NAME || 'HelixCRM API',
    port: parseInt(process.env.PORT || '3001', 10),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    apiPrefix: process.env.API_PREFIX || 'api',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Organization-Id',
      ],
    },
    bodyParser: {
      limit: process.env.BODY_LIMIT || '10mb',
    },
  },
});
