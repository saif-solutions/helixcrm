// apps/api/src/config/auth.config.ts

export interface AuthConfig {
  auth: {
    jwt: {
      secret: string;
      refreshSecret: string;
      expiresIn: string;
      refreshExpiresIn: string;
      issuer: string;
      audience: string;
      algorithm?: 'HS256' | 'HS384' | 'HS512';
      clockTolerance?: number;
    };
    bcrypt: {
      rounds: number;
      saltRounds?: number;
    };
    rateLimit: {
      login: {
        windowMs: number;
        max: number;
        skipSuccessful?: boolean;
      };
      api: {
        ttl: number;
        limit: number;
      };
      passwordReset: {
        windowMs: number;
        max: number;
      };
      twoFactor: {
        windowMs: number;
        max: number;
      };
    };
    session: {
      maxAge: number;
      resave?: boolean;
      saveUninitialized?: boolean;
    };
    password: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number; // days
      preventReuse: number; // number of previous passwords to prevent reuse
    };
    mfa: {
      enabled: boolean;
      issuer: string;
      digits: number;
      period: number;
      window: number;
    };
  };
}

export default (): AuthConfig => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    auth: {
      jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        refreshSecret:
          process.env.JWT_REFRESH_SECRET ||
          'default-refresh-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'helixcrm',
        audience: process.env.JWT_AUDIENCE || 'helixcrm-client',
        algorithm: (process.env.JWT_ALGORITHM || 'HS256') as
          | 'HS256'
          | 'HS384'
          | 'HS512',
        clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE || '30', 10), // 30 seconds
      },
      bcrypt: {
        rounds: parseInt(
          process.env.BCRYPT_ROUNDS || (isProduction ? '12' : '10'),
          10,
        ),
        saltRounds: parseInt(
          process.env.BCRYPT_ROUNDS || (isProduction ? '12' : '10'),
          10,
        ),
      },
      rateLimit: {
        login: {
          windowMs: parseInt(
            process.env.LOGIN_RATE_LIMIT_WINDOW || '900000',
            10,
          ), // 15 minutes
          max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
          skipSuccessful: process.env.LOGIN_RATE_LIMIT_SKIP_SUCCESS !== 'false',
        },
        api: {
          ttl: parseInt(process.env.API_RATE_LIMIT_TTL || '60', 10),
          limit: parseInt(process.env.API_RATE_LIMIT_LIMIT || '100', 10),
        },
        passwordReset: {
          windowMs: parseInt(
            process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW || '3600000',
            10,
          ), // 1 hour
          max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || '3', 10),
        },
        twoFactor: {
          windowMs: parseInt(
            process.env.TWO_FACTOR_RATE_LIMIT_WINDOW || '900000',
            10,
          ), // 15 minutes
          max: parseInt(process.env.TWO_FACTOR_RATE_LIMIT_MAX || '5', 10),
        },
      },
      session: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000', 10), // 7 days
        resave: process.env.SESSION_RESAVE === 'true',
        saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
      },
      password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
        maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90', 10), // 90 days
        preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5', 10),
      },
      mfa: {
        enabled: process.env.MFA_ENABLED === 'true',
        issuer: process.env.MFA_ISSUER || 'HelixCRM',
        digits: parseInt(process.env.MFA_DIGITS || '6', 10),
        period: parseInt(process.env.MFA_PERIOD || '30', 10),
        window: parseInt(process.env.MFA_WINDOW || '1', 10),
      },
    },
  };
};
