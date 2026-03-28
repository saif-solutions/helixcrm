// apps/api/src/config/auth.config.ts

export default () => ({
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'helixcrm',
      audience: process.env.JWT_AUDIENCE || 'helixcrm-client',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    },
    rateLimit: {
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
      },
      api: {
        ttl: 60, // 1 minute
        limit: 100, // 100 requests per minute
      },
      passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts
      },
    },
    session: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
});
