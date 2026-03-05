// apps/api/src/instrument.ts

import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "https://25f24091dfb47f769402199524bfa78a@o4510992535388160.ingest.de.sentry.io/4510992613113936",
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});