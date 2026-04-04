/**
 * Storage module: Transform utilities
 * 
 * Provides consistent camelCase/snake_case conversion for database operations.
 * All Supabase query results are transformed to camelCase before returning.
 * All inserts/updates are transformed to snake_case before sending to Supabase.
 */

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert object keys from camelCase to snake_case
 */
export function objectToSnakeCase<T>(obj: Record<string, unknown>): T {
  if (obj === null || typeof obj !== "object") {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToSnakeCase(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    
    // Recursively transform nested objects
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Handle Date objects specially
      if (value instanceof Date) {
        result[snakeKey] = value.toISOString();
      } else {
        result[snakeKey] = objectToSnakeCase(value as Record<string, unknown>);
      }
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) => 
        typeof item === "object" && item !== null 
          ? objectToSnakeCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Recursively convert object keys from snake_case to camelCase
 */
export function objectToCamelCase<T>(obj: Record<string, unknown>): T {
  if (obj === null || typeof obj !== "object") {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToCamelCase(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    
    // Recursively transform nested objects
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[camelKey] = objectToCamelCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) => 
        typeof item === "object" && item !== null 
          ? objectToCamelCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Transform an array of database results to camelCase
 */
export function arrayToCamelCase<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => objectToCamelCase<T>(item));
}

/**
 * Transform an array of objects to snake_case for database insertion
 */
export function arrayToSnakeCase<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => objectToSnakeCase<T>(item));
}
