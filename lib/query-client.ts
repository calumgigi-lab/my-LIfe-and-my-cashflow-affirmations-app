import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Production backend URL - baked into APK
  const productionUrl = "https://global-affirmation-hub-api.vercel.app/";
  
  // Use production URL by default, or allow environment override for development
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) {
    return explicitUrl.endsWith("/") ? explicitUrl : `${explicitUrl}/`;
  }

  return productionUrl;
}

function getTunnelHeaders(baseUrl: string): Record<string, string> {
  // localtunnel can block requests unless this header is present.
  return baseUrl.includes(".loca.lt")
    ? { "bypass-tunnel-reminder": "true" }
    : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const tunnelHeaders = getTunnelHeaders(baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data
      ? { ...tunnelHeaders, "Content-Type": "application/json" }
      : tunnelHeaders,
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
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);
    const tunnelHeaders = getTunnelHeaders(baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
      headers: tunnelHeaders,
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
