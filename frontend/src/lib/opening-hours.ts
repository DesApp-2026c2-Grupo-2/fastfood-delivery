// Junta los días que comparten la misma franja, aunque no sean seguidos.
// "Mar 10:00-15:00 · Jue 10:00-15:00" queda "Mar y Jue 10:00-15:00".
export function compactOpeningHours(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const groups: { days: string[]; hours: string }[] = [];
  for (const part of trimmed.split(' · ')) {
    const parsed = splitHoursPart(part);
    if (!parsed) {
      groups.push({ days: [part.trim()], hours: '' });
      continue;
    }
    const same = groups.find((group) => group.hours === parsed.hours);
    if (same) same.days.push(parsed.days);
    else groups.push({ days: [parsed.days], hours: parsed.hours });
  }

  return groups
    .map((group) => (group.hours ? `${group.days.join(' y ')} ${group.hours}` : group.days.join(' y ')))
    .join(' · ');
}

function splitHoursPart(part: string): { days: string; hours: string } | null {
  const match = part.trim().match(/^(.+?)\s+(\d{1,2}:\d{2}.*)$/);
  if (!match) return null;
  const days = match[1].trim();
  const hours = match[2].trim();
  if (!days || !hours) return null;
  return { days, hours };
}
