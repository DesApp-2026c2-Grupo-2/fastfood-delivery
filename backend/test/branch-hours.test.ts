import { formatOpeningHours, nextOpenPhrase, openingState, storedSlots, validateSlots } from '../src/branches/branch-hours';

const week = [
  { weekday: 0, opensAt: '10:00', closesAt: '23:00' },
  { weekday: 1, opensAt: '10:00', closesAt: '23:00' },
  { weekday: 2, opensAt: '10:00', closesAt: '23:00' },
  { weekday: 3, opensAt: '10:00', closesAt: '23:00' },
  { weekday: 4, opensAt: '10:00', closesAt: '23:00' },
  { weekday: 5, opensAt: '11:00', closesAt: '15:00' },
];

describe('horario de sucursal', () => {
  it('agrupa los días seguidos con la misma franja', () => {
    expect(formatOpeningHours(week)).toBe('Lun-Vie 10:00-23:00 · Sáb 11:00-15:00');
  });

  it('rechaza un cierre anterior a la apertura', () => {
    expect(validateSlots([{ weekday: 0, opensAt: '18:00', closesAt: '10:00' }])).toBe(
      'El cierre tiene que ser después de la apertura.',
    );
  });

  it('está abierta dentro de la franja de hoy', () => {
    const state = openingState(week, new Date('2026-11-09T15:00:00-03:00'));
    expect(state).toMatchObject({ configured: true, openNow: true, nextOpenAt: null });
  });

  it('antes de abrir, la próxima apertura es hoy', () => {
    const state = openingState(week, new Date('2026-11-09T09:30:00-03:00'));
    expect(state.openNow).toBe(false);
    expect(state.nextOpenAt?.toISOString()).toBe('2026-11-09T13:00:00.000Z');
    expect(nextOpenPhrase(state.nextOpenAt as Date)).toBe('el lunes 9 de noviembre a las 10:00');
  });

  it('después de cerrar, programa el día siguiente', () => {
    const state = openingState(week, new Date('2026-11-09T23:10:00-03:00'));
    expect(state.openNow).toBe(false);
    expect(state.nextOpenAt?.toISOString()).toBe('2026-11-10T13:00:00.000Z');
  });

  it('el domingo cerrado salta al lunes', () => {
    const state = openingState(week, new Date('2026-11-15T12:00:00-03:00'));
    expect(state.openNow).toBe(false);
    expect(state.nextOpenAt?.toISOString()).toBe('2026-11-16T13:00:00.000Z');
  });

  it('un día partido se muestra con las dos franjas', () => {
    expect(
      formatOpeningHours([
        { weekday: 0, opensAt: '11:00', closesAt: '15:00' },
        { weekday: 0, opensAt: '19:00', closesAt: '23:00' },
        { weekday: 1, opensAt: '11:00', closesAt: '15:00' },
        { weekday: 1, opensAt: '19:00', closesAt: '23:00' },
      ]),
    ).toBe('Lun-Mar 11:00-15:00 y 19:00-23:00');
  });

  it('rechaza una segunda franja que pisa a la primera', () => {
    expect(
      validateSlots([
        { weekday: 0, opensAt: '11:00', closesAt: '16:00' },
        { weekday: 0, opensAt: '15:00', closesAt: '23:00' },
      ]),
    ).toBe('En lunes, la segunda franja tiene que empezar cuando termina la primera.');
  });

  it('en el corte del horario partido, la próxima apertura es la segunda franja', () => {
    const state = openingState(
      [
        { weekday: 0, opensAt: '08:00', closesAt: '10:00' },
        { weekday: 0, opensAt: '18:00', closesAt: '23:00' },
      ],
      new Date('2026-11-09T12:00:00-03:00'),
    );
    expect(state.openNow).toBe(false);
    expect(state.nextOpenAt?.toISOString()).toBe('2026-11-09T21:00:00.000Z');
  });

  it('sin franjas no se sabe si está abierta', () => {
    expect(openingState([], new Date('2026-11-09T02:00:00-03:00'))).toEqual({
      configured: false,
      openNow: true,
      nextOpenAt: null,
    });
  });

  it('rechaza un día inválido, una hora mal escrita y una tercera franja', () => {
    const ok = { weekday: 0, opensAt: '10:00', closesAt: '14:00' };
    expect(validateSlots([{ ...ok, weekday: 7 }])).toBe('El día del horario no es válido.');
    expect(validateSlots([{ ...ok, opensAt: '10' }])).toBe('El horario tiene que ser HH:mm.');
    expect(validateSlots([{ ...ok, closesAt: '25:00' }])).toBe('El horario tiene que ser HH:mm.');
    expect(
      validateSlots([
        ok,
        { weekday: 0, opensAt: '15:00', closesAt: '18:00' },
        { weekday: 0, opensAt: '19:00', closesAt: '22:00' },
      ]),
    ).toBe('El lunes puede tener hasta dos franjas.');
    expect(validateSlots([ok])).toBeNull();
  });

  it('un solo día se muestra con su nombre corto y las franjas quedan ordenadas', () => {
    expect(formatOpeningHours([{ weekday: 3, opensAt: '12:00', closesAt: '16:00' }])).toBe('Jue 12:00-16:00');
    expect(
      storedSlots([
        { weekday: 0, opensAt: '19:00', closesAt: '23:00' },
        { weekday: 0, opensAt: '11:00', closesAt: '15:00' },
      ]),
    ).toEqual([
      { weekday: 0, opensAt: '11:00', closesAt: '15:00', slot: 0 },
      { weekday: 0, opensAt: '19:00', closesAt: '23:00', slot: 1 },
    ]);
  });

  it('si ningún día de la semana tiene franja, no hay próxima apertura', () => {
    const state = openingState(
      [{ weekday: 9, opensAt: '10:00', closesAt: '12:00' }],
      new Date('2026-11-09T15:00:00-03:00'),
    );
    expect(state).toEqual({ configured: true, openNow: false, nextOpenAt: null });
  });
});
