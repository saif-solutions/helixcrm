import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

if (!dsn && environment === 'production') {
  console.warn('Sentry DSN is not set. Sentry error tracking disabled.');
}

Sentry.init({
  dsn: dsn || undefined,
  environment,
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
});
