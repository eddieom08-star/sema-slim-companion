import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

// API base URL - use production URL when running on native platform (iOS/Android)
export const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    return "https://sema-slim-companion.vercel.app";
  }
  return ""; // Use relative URLs for web
};

// Get Clerk session token - will be injected by auth wrapper
let getSessionToken: (() => Promise<string | null>) | null = null;
let tokenGetterReady = false;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getSessionToken = getter;
  tokenGetterReady = true;
}

export function hasAuthTokenGetter(): boolean {
  return getSessionToken !== null;
}

export function isTokenGetterReady(): boolean {
  return tokenGetterReady;
}

// Token getter will be configured by initializeMobile() before React renders

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error('[QueryClient] API Error:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      responseText: text.substring(0, 200)
    });
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (getSessionToken) {
    try {
      const token = await getSessionToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[QueryClient] Failed to get session token:', error);
    }
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeout?: number },
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl + url;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? 15000);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...authHeaders,
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getApiBaseUrl();
    const url = queryKey.join("/") as string;
    const fullUrl = baseUrl + url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(fullUrl, {
        headers: authHeaders,
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (was Infinity - caused stale data issues)
      retry: 2, // Retry twice for network resilience on mobile
      retryDelay: 1000,
    },
    mutations: {
      retry: 1, // Single retry for mutations
    },
  },
});
