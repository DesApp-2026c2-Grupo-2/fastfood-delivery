import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

function useMenuDismiss(open: boolean, onClose: () => void, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, rootRef]);
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatDateDisplay(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return 'dd/mm/aaaa';
  return `${pad2(parsed.day)}/${pad2(parsed.month)}/${parsed.year}`;
}

function todayIsoAR() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function monthLabel(year: number, month: number) {
  const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

export function DateFilter({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const selected = parseIsoDate(value);
  const initial = selected ?? parseIsoDate(todayIsoAR())!;
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useMenuDismiss(open, close, rootRef);

  useEffect(() => {
    if (!open) return;
    const next = selected ?? parseIsoDate(todayIsoAR())!;
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [open, selected?.year, selected?.month, selected?.day]);

  const days = useMemo(() => {
    const total = new Date(viewYear, viewMonth, 0).getDate();
    const firstDow = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
    const cells: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      cells.push({ day, iso: toIsoDate(viewYear, viewMonth, day) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  }

  return (
    <div className="reports-date-filter" ref={rootRef}>
      <button
        type="button"
        className={`reports-date-trigger${open ? ' is-open' : ''}${value ? '' : ' is-empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatDateDisplay(value)}</span>
      </button>
      {open ? (
        <div className="reports-date-menu" role="dialog" aria-label={label}>
          <div className="reports-date-nav">
            <button type="button" className="reports-date-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <strong>{monthLabel(viewYear, viewMonth)}</strong>
            <button type="button" className="reports-date-nav-btn" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <div className="reports-date-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="reports-date-grid">
            {days.map((cell, index) =>
              cell ? (
                <button
                  key={cell.iso}
                  type="button"
                  className={`reports-date-day${cell.iso === value ? ' is-selected' : ''}${cell.iso === todayIsoAR() ? ' is-today' : ''}`}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              ) : (
                <span key={`empty-${index}`} className="reports-date-day is-empty" />
              ),
            )}
          </div>
          <div className="reports-date-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayIsoAR());
                setOpen(false);
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
