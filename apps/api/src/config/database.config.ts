// apps/api/src/config/database.config.ts

export default () => ({
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeout: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || '30000',
      10,
    ),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10),
    maxQueryExecutionTime: parseInt(
      process.env.DB_MAX_QUERY_TIME || '5000',
      10,
    ),
    // Enable query logging in development
    logQueries: process.env.NODE_ENV === 'development',
  },
});
