// Horario de sucursal en hora de Argentina. weekday 0 = lunes … 6 = domingo.
// Argentina no usa horario de verano: el reloj civil es UTC-3 todo el año.

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
const WEEKDAY_FROM_EN: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export type BranchHourSlot = {
  weekday: number;
  opensAt: string;
  closesAt: string;
};

export function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function groupedByDay(slots: BranchHourSlot[]) {
  const byDay = new Map<number, BranchHourSlot[]>();
  for (const slot of slots) {
    const list = byDay.get(slot.weekday) ?? [];
    list.push(slot);
    byDay.set(slot.weekday, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (parseTime(a.opensAt) ?? 0) - (parseTime(b.opensAt) ?? 0));
  }
  return byDay;
}

function rangeLabel(slots: BranchHourSlot[]) {
  return slots.map((slot) => `${slot.opensAt}-${slot.closesAt}`).join(' y ');
}

export function validateSlots(slots: BranchHourSlot[]): string | null {
  const byDay = new Map<number, BranchHourSlot[]>();
  for (const slot of slots) {
    if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6) {
      return 'El día del horario no es válido.';
    }
    const opens = parseTime(slot.opensAt);
    const closes = parseTime(slot.closesAt);
    if (opens === null || closes === null) return 'El horario tiene que ser HH:mm.';
    if (closes <= opens) return 'El cierre tiene que ser después de la apertura.';
    const list = byDay.get(slot.weekday) ?? [];
    list.push(slot);
    if (list.length > 2) return `El ${DAY_NAMES[slot.weekday]} puede tener hasta dos franjas.`;
    byDay.set(slot.weekday, list);
  }
  for (const [weekday, list] of byDay) {
    const sorted = [...list].sort((a, b) => (parseTime(a.opensAt) ?? 0) - (parseTime(b.opensAt) ?? 0));
    if (sorted.length === 2 && (parseTime(sorted[1].opensAt) ?? 0) < (parseTime(sorted[0].closesAt) ?? 0)) {
      return `En ${DAY_NAMES[weekday]}, la segunda franja tiene que empezar cuando termina la primera.`;
    }
  }
  return null;
}

export type StoredHour = BranchHourSlot & { slot: number };

export function storedSlots(slots: BranchHourSlot[]): StoredHour[] {
  const stored: StoredHour[] = [];
  for (const [weekday, list] of groupedByDay(slots)) {
    list.forEach((slot, index) => stored.push({ weekday, opensAt: slot.opensAt, closesAt: slot.closesAt, slot: index }));
  }
  return stored;
}

export function formatOpeningHours(slots: BranchHourSlot[]): string {
  const byDay = groupedByDay(slots);
  const groups: { from: number; to: number; label: string }[] = [];
  for (const weekday of [...byDay.keys()].sort((a, b) => a - b)) {
    const label = rangeLabel(byDay.get(weekday) ?? []);
    const last = groups[groups.length - 1];
    if (last && last.to + 1 === weekday && last.label === label) last.to = weekday;
    else groups.push({ from: weekday, to: weekday, label });
  }
  return groups
    .map((group) => {
      const days = group.from === group.to ? SHORT[group.from] : `${SHORT[group.from]}-${SHORT[group.to]}`;
      return `${days} ${group.label}`;
    })
    .join(' · ');
}

type ZonedNow = { weekday: number; year: number; month: number; day: number; minutes: number };

function argentinaNow(date: Date): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = read('hour') === '24' ? 0 : Number(read('hour'));
  return {
    weekday: WEEKDAY_FROM_EN[read('weekday')] ?? 0,
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    minutes: hour * 60 + Number(read('minute')),
  };
}

function atArgentina(year: number, month: number, day: number, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hh}:${mm}:00-03:00`,
  );
}

function addDays(year: number, month: number, day: number, amount: number) {
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export type OpeningState = {
  configured: boolean;
  openNow: boolean;
  nextOpenAt: Date | null;
};

// Sin franjas no se sabe si está abierta: configured false y no se bloquea el pedido.
function rangesOf(slots: BranchHourSlot[], weekday: number) {
  return (groupedByDay(slots).get(weekday) ?? []).map((slot) => ({
    opens: parseTime(slot.opensAt) ?? 0,
    closes: parseTime(slot.closesAt) ?? 0,
  }));
}

export function openingState(slots: BranchHourSlot[], now: Date = new Date()): OpeningState {
  if (slots.length === 0) return { configured: false, openNow: true, nextOpenAt: null };
  const here = argentinaNow(now);
  for (const range of rangesOf(slots, here.weekday)) {
    if (here.minutes >= range.opens && here.minutes < range.closes) {
      return { configured: true, openNow: true, nextOpenAt: null };
    }
    if (here.minutes < range.opens) {
      return { configured: true, openNow: false, nextOpenAt: atArgentina(here.year, here.month, here.day, range.opens) };
    }
  }
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const weekday = (here.weekday + ahead) % 7;
    const ranges = rangesOf(slots, weekday);
    if (ranges.length === 0) continue;
    const date = addDays(here.year, here.month, here.day, ahead);
    return {
      configured: true,
      openNow: false,
      nextOpenAt: atArgentina(date.year, date.month, date.day, ranges[0].opens),
    };
  }
  return { configured: true, openNow: false, nextOpenAt: null };
}

export function nextOpenPhrase(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = read('hour') === '24' ? '00' : read('hour');
  return `el ${read('weekday')} ${read('day')} de ${read('month')} a las ${hour}:${read('minute')}`;
}
