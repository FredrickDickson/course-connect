import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { supabase } from "@/integrations/supabase/client";

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeader = await getAuthHeader();
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeader,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const url = new URL(queryKey[0] as string, window.location.origin);
    if (queryKey.length > 1 && typeof queryKey[1] === "object") {
      const params = queryKey[1] as Record<string, unknown>;
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const authHeader = await getAuthHeader();
    const res = await fetch(url.toString(), {
      headers: {
        ...authHeader,
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: Error) => {
        // Retry on network errors and 5xx server errors
        // Don't retry on 4xx client errors (except 408 Request Timeout)
        if (error instanceof Error) {
          const message = error.message;
          // Retry on network errors
          if (message.includes("fetch") || message.includes("network")) {
            return failureCount < 3;
          }
          // Extract status code from error message (e.g., "500: Internal Server Error")
          const statusMatch = message.match(/^(\d+):/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            // Retry on 5xx errors and 408 timeout
            if (status >= 500 || status === 408) {
              return failureCount < 3;
            }
            // Don't retry on 4xx client errors
            if (status >= 400 && status < 500) {
              return false;
            }
          }
        }
        // Default: retry up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    },
    mutations: {
      retry: false, // Don't retry mutations (they may have side effects)
    },
  },
});
