import { getApiUrl } from './api-url';

const API_URL = getApiUrl();
const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(url: string | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${MEDIA_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}
