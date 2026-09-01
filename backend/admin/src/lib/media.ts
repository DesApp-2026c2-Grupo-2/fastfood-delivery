const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(url: string | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${MEDIA_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}
