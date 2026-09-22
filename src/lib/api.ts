export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message || `Request failed (${response.status})`, response.status);
  return body as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
