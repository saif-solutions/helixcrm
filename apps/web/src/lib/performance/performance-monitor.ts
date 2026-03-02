/**
 * Performance Monitoring Service
 * 
 * Tracks Core Web Vitals, component render times, and API latency.
 * Reports metrics to logging service and optionally to analytics.
 */

import { logger } from '../logging/logger.service';
import React, { useEffect, useRef } from 'react';

// Type declaration for LayoutShift (not in standard TypeScript lib)
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  lastInputTime: number;
  sources: LayoutShiftSource[];
}

interface LayoutShiftSource {
  node?: Node;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'score';
  tags?: Record<string, string>;
  timestamp: number;
}

export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private isDevelopment = import.meta.env.DEV;
  private observers: PerformanceObserver[] = [];
  private initialized = false;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    this.observeCoreWebVitals();
    this.observeLongTasks();
    this.observeResourceTiming();
    this.initialized = true;

    logger.info('Performance monitoring initialized');
  }

  /**
   * Observe Core Web Vitals using PerformanceObserver
   */
  private observeCoreWebVitals() {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.startTime;
        
        this.recordMetric({
          name: 'LCP',
          value: lcp,
          unit: 'ms',
          timestamp: Date.now(),
        });

        logger.info(`🌊 LCP: ${Math.round(lcp)}ms`, {
          component: 'PerformanceMonitor',
          metric: 'LCP',
          value: lcp,
          rating: this.getWebVitalRating('LCP', lcp),
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fcp = entries[0].startTime;
          
          this.recordMetric({
            name: 'FCP',
            value: fcp,
            unit: 'ms',
            timestamp: Date.now(),
          });

          logger.info(`🎨 FCP: ${Math.round(fcp)}ms`, {
            component: 'PerformanceMonitor',
            metric: 'FCP',
            value: fcp,
            rating: this.getWebVitalRating('FCP', fcp),
          });
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      this.observers.push(fcpObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as LayoutShift;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          unit: 'score',
          timestamp: Date.now(),
        });

        logger.info(`📏 CLS: ${clsValue.toFixed(3)}`, {
          component: 'PerformanceMonitor',
          metric: 'CLS',
          value: clsValue,
          rating: this.getWebVitalRating('CLS', clsValue),
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0] as PerformanceEventTiming;
        const fid = firstInput.processingStart - firstInput.startTime;
        
        this.recordMetric({
          name: 'FID',
          value: fid,
          unit: 'ms',
          timestamp: Date.now(),
        });

        logger.info(`⌨️ FID: ${Math.round(fid)}ms`, {
          component: 'PerformanceMonitor',
          metric: 'FID',
          value: fid,
          rating: this.getWebVitalRating('FID', fid),
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);

    } catch (error) {
      logger.warn('PerformanceObserver not fully supported', { error });
    }
  }

  /**
   * Observe long tasks (tasks > 50ms)
   */
  private observeLongTasks() {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            logger.warn(`⚠️ Long Task detected: ${Math.round(entry.duration)}ms`, {
              component: 'PerformanceMonitor',
              metric: 'LongTask',
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(longTaskObserver);
    } catch {
      // Long task observer may not be supported
    }
  }

  /**
   * Observe resource timing (API calls, assets)
   */
  private observeResourceTiming() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only track API calls
          if (entry.name.includes('/api/')) {
            const duration = entry.duration;
            const url = entry.name.split('/api/')[1] || entry.name;

            logger.debug(`⏱️ API Call: ${url} - ${Math.round(duration)}ms`, {
              component: 'PerformanceMonitor',
              metric: 'API Latency',
              url,
              duration,
              entryType: entry.entryType,
            });

            this.recordMetric({
              name: 'API_Latency',
              value: duration,
              unit: 'ms',
              tags: { endpoint: url },
              timestamp: Date.now(),
            });
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch {
      // Resource observer may not be supported
    }
  }

  /**
   * Get Web Vitals rating based on thresholds
   */
  private getWebVitalRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    switch (metric) {
      case 'LCP':
        if (value < 2500) return 'good';
        if (value < 4000) return 'needs-improvement';
        return 'poor';
      case 'FCP':
        if (value < 1800) return 'good';
        if (value < 3000) return 'needs-improvement';
        return 'poor';
      case 'CLS':
        if (value < 0.1) return 'good';
        if (value < 0.25) return 'needs-improvement';
        return 'poor';
      case 'FID':
        if (value < 100) return 'good';
        if (value < 300) return 'needs-improvement';
        return 'poor';
      default:
        return 'needs-improvement';
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // In production, send to backend periodically
    if (!this.isDevelopment) {
      this.sendMetricsToBackend();
    }
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number) {
    this.recordMetric({
      name: 'ComponentRender',
      value: renderTime,
      unit: 'ms',
      tags: { component: componentName },
      timestamp: Date.now(),
    });

    if (renderTime > 50) {
      logger.warn(`🐢 Slow render: ${componentName} (${Math.round(renderTime)}ms)`, {
        component: 'PerformanceMonitor',
        slowComponent: componentName,
        renderTime,
      });
    }
  }

  /**
   * Track route change time
   */
  trackRouteChange(route: string, duration: number) {
    this.recordMetric({
      name: 'RouteChange',
      value: duration,
      unit: 'ms',
      tags: { route },
      timestamp: Date.now(),
    });

    logger.info(`🔄 Route change to ${route}: ${Math.round(duration)}ms`, {
      component: 'PerformanceMonitor',
      route,
      duration,
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, min: Infinity, max: 0, count: 0 };
      }
      
      const stat = summary[metric.name];
      stat.avg = (stat.avg * stat.count + metric.value) / (stat.count + 1);
      stat.min = Math.min(stat.min, metric.value);
      stat.max = Math.max(stat.max, metric.value);
      stat.count++;
    }

    return summary;
  }

  /**
   * Send metrics to backend
   */
  private async sendMetricsToBackend() {
    if (this.metrics.length === 0) return;

    const metrics = [...this.metrics];
    
    try {
      await fetch('/api/v1/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
        keepalive: true,
      });
    } catch {
      // Silently fail in production
    }
  }

  /**
   * Clean up observers
   */
  disconnect() {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
    this.initialized = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper HOC for tracking component renders
// Helper HOC for tracking component renders
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithTracking: React.FC<P> = (props) => {
    const renderStartRef = useRef<number>(0);

    useEffect(() => {
      renderStartRef.current = performance.now();
      
      return () => {
        const renderTime = performance.now() - renderStartRef.current;
        performanceMonitor.trackComponentRender(componentName, renderTime);
      };
    });

    return React.createElement(WrappedComponent, props);
  };
  
  ComponentWithTracking.displayName = `withPerformanceTracking(${displayName})`;
  
  return ComponentWithTracking;
}

// Hook for tracking component render time
export function usePerformanceTracking(componentName: string) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    };
  });
}
