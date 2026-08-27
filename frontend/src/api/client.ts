const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type ApiOptions = RequestInit & { token?: string };

function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: string | string[] }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return `Error ${status}`;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }
  return body as T;
}
