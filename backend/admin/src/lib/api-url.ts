export function getApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.API_URL || '/api';
  return raw.replace(/\/$/, '');
}
