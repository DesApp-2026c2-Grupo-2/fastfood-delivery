const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con la API. ¿Está corriendo el backend en el puerto 3000?');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }
  return body as T;
}

export async function uploadImages(files: File[], token: string): Promise<string[]> {
  const body = new FormData();
  for (const file of files) {
    body.append('files', file);
  }
  const result = await api<{ urls: string[] }>('/admin/uploads', {
    method: 'POST',
    token,
    body,
  });
  return result.urls;
}
