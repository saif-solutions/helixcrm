/**
 * Performance Baseline Measurement
 * 
 * This file contains utilities to measure Core Web Vitals and other performance metrics.
 * Run this in development to establish baseline measurements.
 */

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

export interface PerformanceBaseline {
  // Core Web Vitals
  FCP: number; // First Contentful Paint (ms)
  LCP: number; // Largest Contentful Paint (ms)
  TTI: number; // Time to Interactive (ms)
  CLS: number; // Cumulative Layout Shift
  FID?: number; // First Input Delay (ms) - requires user interaction
  
  // Additional metrics
  apiLatency: {
    average: number;
    p95: number;
    p99: number;
  };
  componentRenderTimes: Record<string, number>;
  bundleSize: {
    total: number;
    js: number;
    css: number;
  };
}

class PerformanceBaselineService {
  private metrics: Partial<PerformanceBaseline> = {};
  private apiLatencies: number[] = [];
  private renderTimes: Map<string, number[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.observeCoreWebVitals();
      this.observeNavigationTiming();
    }
  }

  /**
   * Observe Core Web Vitals using web-vitals library
   * Note: You'll need to install: npm install web-vitals
   */
  private observeCoreWebVitals() {
    // This would use the web-vitals library
    // For now, we'll use PerformanceObserver where available
    if ('PerformanceObserver' in window) {
      try {
        // Observe Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = lastEntry.startTime;
          console.log(`📊 LCP: ${lastEntry.startTime}ms`);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Observe First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            this.metrics.FCP = entries[0].startTime;
            console.log(`📊 FCP: ${entries[0].startTime}ms`);
          }
        });
        fcpObserver.observe({ type: 'paint', buffered: true });

        // Observe Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as LayoutShift;
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          this.metrics.CLS = clsValue;
          console.log(`📊 CLS: ${clsValue}`);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

      } catch (e) {
        console.warn('PerformanceObserver not fully supported:', e);
      }
    }
  }

  /**
   * Observe navigation timing for TTI approximation
   */
  private observeNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          // Approximate TTI as DOM Interactive
          this.metrics.TTI = navigation.domInteractive;
          console.log(`📊 TTI (approx): ${navigation.domInteractive}ms`);
        }
      }, 0);
    });
  }

  /**
   * Record API call latency
   */
  recordApiLatency(endpoint: string, duration: number) {
    this.apiLatencies.push(duration);
    console.log(`📊 API ${endpoint}: ${duration}ms`);
  }

  /**
   * Record component render time
   */
  recordComponentRender(componentName: string, duration: number) {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    this.renderTimes.get(componentName)!.push(duration);
  }

  /**
   * Calculate percentile value
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get baseline measurement
   */
  getBaseline(): PerformanceBaseline {
    const apiLatencies = this.apiLatencies;
    
    return {
      FCP: this.metrics.FCP || 0,
      LCP: this.metrics.LCP || 0,
      TTI: this.metrics.TTI || 0,
      CLS: this.metrics.CLS || 0,
      apiLatency: {
        average: apiLatencies.reduce((a, b) => a + b, 0) / apiLatencies.length || 0,
        p95: this.percentile(apiLatencies, 95),
        p99: this.percentile(apiLatencies, 99),
      },
      componentRenderTimes: Object.fromEntries(
        Array.from(this.renderTimes.entries()).map(([name, times]) => [
          name,
          times.reduce((a, b) => a + b, 0) / times.length,
        ])
      ),
      bundleSize: {
        total: 0, // Would be populated by build tool
        js: 0,
        css: 0,
      },
    };
  }

  /**
   * Save baseline to file
   */
  saveBaseline(): PerformanceBaseline | undefined {
    const baseline = this.getBaseline();
    const baselineJson = JSON.stringify(baseline, null, 2);
    
    if (import.meta.env.DEV) {
      console.log('📊 Performance Baseline:', baselineJson);
      return baseline;
    }
    
    return undefined;
  }
}

export const performanceBaseline = new PerformanceBaselineService();