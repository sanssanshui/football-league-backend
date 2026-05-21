export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export async function apiFetch(path: string, options?: FetchOptions): Promise<any> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options?.method || "GET",
    headers,
    body: options?.body,
  });

  return res.json();
}
