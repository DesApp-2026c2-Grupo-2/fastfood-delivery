export function parseNotesAndExtras(notesRaw?: string | null) {
  if (!notesRaw) return { extrasNames: [], kitchenNote: '' };

  const text = notesRaw.trim();
  let extrasNames: string[] = [];
  let kitchenNote = text;

  const extrasMatch = text.match(/(?:^|[|;\n])\s*(?:extras?:?|con:?)\s*([^|;\n]+)/i);
  if (extrasMatch) {
    extrasNames = extrasMatch[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    kitchenNote = text.replace(extrasMatch[0], '').replace(/^[|;\s]+|[|;\s]+$/g, '').trim();
  }

  return { extrasNames, kitchenNote };
}
