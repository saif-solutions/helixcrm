/**
 * Analytics Service
 * 
 * Tracks user actions, page views, and feature usage.
 * In production, sends data to backend for aggregation.
 * No PII (Personally Identifiable Information) is tracked.
 */

import { logger } from '../logging/logger.service';

export type AnalyticsEventType = 
  | 'page_view'
  | 'feature_use'
  | 'button_click'
  | 'form_submit'
  | 'search'
  | 'filter'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'error'
  | 'performance';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  userId?: string;
  organizationId?: string;
  properties: Record<string, unknown>;
  metadata?: {
    path?: string;
    component?: string;
    duration?: number;
    correlationId?: string;
  };
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private isDevelopment = import.meta.env.DEV;
  private flushInterval: number = 10000; // 10 seconds
  private userId?: string;
  private organizationId?: string;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    
    if (!this.isDevelopment) {
      // In production, periodically flush events to backend
      setInterval(() => this.flush(), this.flushInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush(true));
    }
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, organizationId: string) {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext() {
    this.userId = undefined;
    this.organizationId = undefined;
    this.sessionId = this.generateSessionId(); // New session on logout
  }

  /**
   * Track a page view
   */
  trackPageView(path: string, title?: string) {
    this.track({
      type: 'page_view',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        path,
        title: title || document.title,
        referrer: document.referrer,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      },
      metadata: {
        path,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: string, properties: Record<string, unknown> = {}) {
    this.track({
      type: 'feature_use',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        feature,
        action,
        ...properties,
      },
      metadata: {
        component: feature,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, location: string, properties: Record<string, unknown> = {}) {
    this.track({
      type: 'button_click',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        button: buttonName,
        location,
        ...properties,
      },
      metadata: {
        component: location,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmit(formName: string, success: boolean, duration?: number) {
    this.track({
      type: 'form_submit',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        form: formName,
        success,
        duration,
      },
      metadata: {
        component: formName,
        duration,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track search
   */
  trackSearch(query: string, resultCount: number, filters?: Record<string, unknown>) {
    // Hash the query to avoid storing PII
    const hashedQuery = this.hashString(query);
    
    this.track({
      type: 'search',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        queryHash: hashedQuery,
        queryLength: query.length,
        resultCount,
        filters,
      },
      metadata: {
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track filter usage
   */
  trackFilter(filterName: string, value: unknown, context: string) {
    const processedValue = typeof value === 'string' ? this.hashString(value) : value;
    
    this.track({
      type: 'filter',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        filter: filterName,
        value: processedValue,
        context,
      },
      metadata: {
        component: context,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track export
   */
  trackExport(format: string, recordCount: number, type: string) {
    this.track({
      type: 'export',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        format,
        recordCount,
        type,
      },
      metadata: {
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track error (non-PII)
   */
  trackError(errorCode: string, component?: string, metadata?: Record<string, unknown>) {
    this.track({
      type: 'error',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        errorCode,
        component,
        ...metadata,
      },
      metadata: {
        component,
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metricName: string, value: number, unit: string, tags?: Record<string, string>) {
    this.track({
      type: 'performance',
      timestamp: Date.now(),
      userId: this.userId,
      organizationId: this.organizationId,
      properties: {
        metric: metricName,
        value,
        unit,
        tags,
      },
      metadata: {
        correlationId: logger['correlationId'] ?? undefined,
      },
    });
  }

  /**
   * Generic track method
   */
  private track(event: AnalyticsEvent) {
    // Ensure correlationId is converted from null to undefined
    if (event.metadata?.correlationId === null) {
      event.metadata.correlationId = undefined;
    }

    // In development, log to console
    if (this.isDevelopment) {
      logger.debug(`📊 Analytics: ${event.type}`, {
        properties: event.properties,
        metadata: event.metadata,
      });
    }

    this.events.push(event);

    // Flush if queue is getting large
    if (this.events.length >= 50) {
      this.flush();
    }
  }

  /**
   * Flush events to backend
   */
  private async flush(isUnload: boolean = false) {
    if (this.events.length === 0) return;

    const events = [...this.events];
    this.events = [];

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events,
        }),
      };

      if (isUnload) {
        fetchOptions.keepalive = true;
      }

      await fetch('/api/v1/analytics', fetchOptions);
    } catch {
      // Silently fail in production
      if (this.isDevelopment) {
        logger.warn('Failed to flush analytics');
      }
    }
  }

  /**
   * Simple hash function for PII data
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get session ID (for debugging)
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();

// React hook for analytics
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useAnalytics() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location]);

  return analytics;
}