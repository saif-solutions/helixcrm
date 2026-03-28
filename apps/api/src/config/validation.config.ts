// apps/api/src/config/validation.config.ts

export interface ValidationConfig {
  validation: {
    request: {
      whitelist: boolean;
      forbidNonWhitelisted: boolean;
      forbidUnknownValues: boolean;
      validationError: {
        target: boolean;
        value: boolean;
      };
    };
    password: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
      patterns: {
        uppercase: RegExp;
        lowercase: RegExp;
        number: RegExp;
        special: RegExp;
      };
    };
    email: {
      pattern: RegExp;
      maxLength: number;
    };
    phone: {
      pattern: RegExp;
      formats: string[];
    };
    date: {
      formats: string[];
    };
    pagination: {
      defaultLimit: number;
      maxLimit: number;
      defaultPage: number;
    };
    sanitization: {
      stripEmpty: boolean;
      trimStrings: boolean;
    };
  };
}

export default (): ValidationConfig => ({
  validation: {
    request: {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: {
        target: false,
        value: true,
      },
    },
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
      pattern:
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      patterns: {
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /\d/,
        special: /[@$!%*?&]/,
      },
    },
    email: {
      pattern: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
      maxLength: 255,
    },
    phone: {
      pattern: /^\+?[\d\s-]{10,}$/,
      formats: ['E164', 'national', 'international'],
    },
    date: {
      formats: ['ISO8601', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
    },
    pagination: {
      defaultLimit: 20,
      maxLimit: 100,
      defaultPage: 1,
    },
    sanitization: {
      stripEmpty: true,
      trimStrings: true,
    },
  },
});
