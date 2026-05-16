// Race condition prevention utilities

export class RequestManager {
  private static instance: RequestManager;
  private activeRequests: Map<string, AbortController> = new Map();

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  // Create a new request with cancellation support
  createRequest<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options: {
      timeout?: number;
      retry?: number;
      onCancel?: () => void;
    } = {}
  ): Promise<T> {
    // Cancel any existing request with the same key
    this.cancelRequest(key);

    // Create new abort controller
    const controller = new AbortController();
    this.activeRequests.set(key, controller);

    // Set up timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.activeRequests.delete(key);
        options.onCancel?.();
      }, options.timeout);
    }

    // Execute the request
    const promise = requestFn(controller.signal);

    // Clean up when request completes or fails
    promise
      .finally(() => {
        this.activeRequests.delete(key);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

    return promise;
  }

  // Cancel a specific request
  cancelRequest(key: string): boolean {
    const controller = this.activeRequests.get(key);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(key);
      return true;
    }
    return false;
  }

  // Cancel all active requests
  cancelAllRequests(): number {
    const count = this.activeRequests.size;
    this.activeRequests.forEach((controller) => {
      controller.abort();
    });
    this.activeRequests.clear();
    return count;
  }

  // Check if a request is active
  isRequestActive(key: string): boolean {
    return this.activeRequests.has(key);
  }

  // Get count of active requests
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

// React Query adapter for race condition prevention
export function createRaceConditionSafeQueryFn<T>(
  key: string,
  queryFn: (signal: AbortSignal) => Promise<T>,
  options?: {
    timeout?: number;
    retry?: number;
  }
) {
  const requestManager = RequestManager.getInstance();

  return async (): Promise<T> => {
    return requestManager.createRequest(key, queryFn, options);
  };
}

// Navigation guard to prevent race conditions during rapid navigation
export class NavigationGuard {
  private static instance: NavigationGuard;
  private navigationInProgress = false;
  private pendingNavigation: string | null = null;

  static getInstance(): NavigationGuard {
    if (!NavigationGuard.instance) {
      NavigationGuard.instance = new NavigationGuard();
    }
    return NavigationGuard.instance;
  }

  // Attempt navigation with race condition protection
  async navigate(
    to: string,
    navigateFn: (to: string) => void | Promise<void>,
    options: {
      timeout?: number;
      onCancel?: () => void;
    } = {}
  ): Promise<boolean> {
    if (this.navigationInProgress) {
      // Queue the navigation request
      this.pendingNavigation = to;
      return false;
    }

    this.navigationInProgress = true;

    try {
      // Cancel any pending requests
      RequestManager.getInstance().cancelAllRequests();

      // Perform navigation
      await navigateFn(to);
      
      // Clear pending navigation
      this.pendingNavigation = null;
      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      options.onCancel?.();
      return false;
    } finally {
      this.navigationInProgress = false;

      // Process pending navigation if any
      if (this.pendingNavigation && this.pendingNavigation !== to) {
        const pending = this.pendingNavigation;
        this.pendingNavigation = null;
        // Use setTimeout to avoid recursive calls
        setTimeout(() => this.navigate(pending, navigateFn, options), 0);
      }
    }
  }

  // Check if navigation is in progress
  isNavigating(): boolean {
    return this.navigationInProgress;
  }

  // Get pending navigation
  getPendingNavigation(): string | null {
    return this.pendingNavigation;
  }
}

// State guard for preventing race conditions in state updates
export class StateGuard<T> {
  private currentValue: T;
  private pendingValue: T | null = null;
  private updateInProgress = false;

  constructor(initialValue: T) {
    this.currentValue = initialValue;
  }

  // Attempt to update state with race condition protection
  async updateState(
    newValue: T,
    updateFn: (current: T, next: T) => Promise<T>,
    options: {
      timeout?: number;
      onConflict?: (current: T, pending: T, attempted: T) => T;
    } = {}
  ): Promise<T> {
    if (this.updateInProgress) {
      // Queue the update
      this.pendingValue = newValue;
      return this.currentValue;
    }

    this.updateInProgress = true;

    try {
      // Check for conflicts
      if (this.pendingValue !== null && this.pendingValue !== newValue) {
        const resolvedValue = options.onConflict?.(
          this.currentValue,
          this.pendingValue,
          newValue
        ) ?? newValue;
        
        this.currentValue = await updateFn(this.currentValue, resolvedValue);
        this.pendingValue = null;
        return this.currentValue;
      }

      // Perform update
      this.currentValue = await updateFn(this.currentValue, newValue);
      this.pendingValue = null;
      return this.currentValue;
    } finally {
      this.updateInProgress = false;

      // Process pending update if any
      if (this.pendingValue !== null && this.pendingValue !== newValue) {
        const pending = this.pendingValue;
        this.pendingValue = null;
        setTimeout(() => this.updateState(pending, updateFn, options), 0);
      }
    }
  }

  // Get current value
  getValue(): T {
    return this.currentValue;
  }

  // Check if update is in progress
  isUpdating(): boolean {
    return this.updateInProgress;
  }

  // Get pending value
  getPendingValue(): T | null {
    return this.pendingValue;
  }
}

// React hooks for race condition prevention
export function useRequestManager() {
  return RequestManager.getInstance();
}

export function useNavigationGuard() {
  return NavigationGuard.getInstance();
}

export function useStateGuard<T>(initialValue: T) {
  return new StateGuard(initialValue);
}

// Utility functions for common race condition scenarios
export const RaceConditionUtils = {
  // Debounce function calls to prevent rapid successive calls
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | undefined;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  },

  // Throttle function calls to limit frequency
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  },

  // Create a sequential executor for async operations
  createSequentialExecutor() {
    let promiseChain = Promise.resolve();
    
    return {
      execute: <T>(fn: () => Promise<T>): Promise<T> => {
        const next = promiseChain.then(() => fn()).catch(() => {
          // Continue chain even if one operation fails
        }) as Promise<T>;
        promiseChain = next.then(() => undefined, () => undefined);
        return next;
      },
      
      reset: () => {
        promiseChain = Promise.resolve();
      },
    };
  },

  // Create a mutex for exclusive access to resources
  createMutex() {
    let locked = false;
    const waitQueue: Array<(value: void) => void> = [];
    
    return {
      acquire: async (): Promise<void> => {
        if (!locked) {
          locked = true;
          return;
        }
        
        return new Promise<void>((resolve) => {
          waitQueue.push(resolve);
        });
      },
      
      release: () => {
        if (waitQueue.length > 0) {
          const next = waitQueue.shift();
          next?.();
        } else {
          locked = false;
        }
      },
      
      isLocked: () => locked,
    };
  },
};
