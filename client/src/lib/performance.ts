// Performance monitoring utilities
import { useRef, useEffect } from "react";

export interface PerformanceMetrics {
  pageLoadTime: number;
  componentRenderTime: number;
  queryTime: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track page load performance
  trackPageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      this.metrics.set(`page-${pageName}`, {
        pageLoadTime: loadTime,
        componentRenderTime: 0,
        queryTime: 0,
        memoryUsage: this.getMemoryUsage()
      });

      // Log performance warnings
      if (loadTime > 3000) {
        console.warn(`Slow page load detected for ${pageName}: ${loadTime}ms`);
      }
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number): void {
    const existing = this.metrics.get(`component-${componentName}`) || {
      pageLoadTime: 0,
      componentRenderTime: 0,
      queryTime: 0
    };

    existing.componentRenderTime = renderTime;
    this.metrics.set(`component-${componentName}`, existing);

    if (renderTime > 100) {
      console.warn(`Slow component render detected for ${componentName}: ${renderTime}ms`);
    }
  }

  // Track query performance
  trackQuery(queryKey: string[], queryTime: number): void {
    const key = `query-${queryKey.join('-')}`;
    const existing = this.metrics.get(key) || {
      pageLoadTime: 0,
      componentRenderTime: 0,
      queryTime: 0
    };

    existing.queryTime = queryTime;
    this.metrics.set(key, existing);

    if (queryTime > 1000) {
      console.warn(`Slow query detected: ${queryKey.join('/')} - ${queryTime}ms`);
    }
  }

  // Get memory usage if available
  private getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  // Get all metrics
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
  }

  // Get performance summary
  getSummary(): {
    avgPageLoadTime: number;
    avgComponentRenderTime: number;
    avgQueryTime: number;
    totalMetrics: number;
  } {
    const metrics = Array.from(this.metrics.values());
    
    const pageLoads = metrics.filter(m => m.pageLoadTime > 0);
    const componentRenders = metrics.filter(m => m.componentRenderTime > 0);
    const queries = metrics.filter(m => m.queryTime > 0);

    return {
      avgPageLoadTime: pageLoads.length > 0 ? pageLoads.reduce((sum, m) => sum + m.pageLoadTime, 0) / pageLoads.length : 0,
      avgComponentRenderTime: componentRenders.length > 0 ? componentRenders.reduce((sum, m) => sum + m.componentRenderTime, 0) / componentRenders.length : 0,
      avgQueryTime: queries.length > 0 ? queries.reduce((sum, m) => sum + m.queryTime, 0) / queries.length : 0,
      totalMetrics: metrics.length
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance tracking
export function usePerformanceTracker(name: string, type: 'page' | 'component') {
  const startTime = useRef<number>();

  useEffect(() => {
    if (type === 'page') {
      startTime.current = Date.now();
      
      // Track page load on mount
      const timer = setTimeout(() => {
        if (startTime.current) {
          performanceMonitor.trackPageLoad(name);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [name, type]);

  const trackRender = (renderTime: number) => {
    if (type === 'component') {
      performanceMonitor.trackComponentRender(name, renderTime);
    }
  };

  return { trackRender };
}
