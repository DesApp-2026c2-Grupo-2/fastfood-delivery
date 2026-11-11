const TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function nextOpenPhrase(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = read('hour') === '24' ? '00' : read('hour');
  return `el ${read('weekday')} ${read('day')} de ${read('month')} a las ${hour}:${read('minute')}`;
}

export function openStatusLabel(
  openNow: boolean | null | undefined,
  nextOpenAt?: string | null,
): string | null {
  if (openNow === true) return 'Abierta ahora';
  if (openNow === false) return nextOpenAt ? `Cerrada. Abre ${nextOpenPhrase(nextOpenAt)}` : 'Cerrada';
  return null;
}
