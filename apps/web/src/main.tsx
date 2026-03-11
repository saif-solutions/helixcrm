import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry } from './lib/monitoring/sentry';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';

// Initialize Sentry (only in production)
initSentry();

// Wrap the entire app with Sentry's error boundary that uses your existing ErrorBoundary
const SentryWrappedApp = Sentry.withErrorBoundary(App, {
  fallback: (errorData) => (
    <ErrorBoundary
      fallback={null} // Use default UI from your ErrorBoundary
    >
      <div>{errorData.error?.toString()}</div>
    </ErrorBoundary>
  ),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SentryWrappedApp />
    </ErrorBoundary>
  </React.StrictMode>
);
