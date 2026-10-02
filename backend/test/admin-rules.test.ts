import { orderTimingText } from '../admin/src/lib/order-timing';
import { MAX_AVAILABLE, parseAvailable, stockAdjustments } from '../admin/src/lib/stock-adjustment';

const adjustment = (id: string) => {
  const found = stockAdjustments.find((item) => item.id === id);
  if (!found) throw new Error(`Falta la acción ${id}`);
  return found;
};

describe('Ajustes masivos de stock', () => {
  const add = adjustment('add');
  const sub = adjustment('sub');
  const zero = adjustment('zero');

  it('suma y no pasa del máximo', () => {
    expect(add.apply(100, 5)).toBe(105);
    expect(add.apply(MAX_AVAILABLE - 2, 10)).toBe(MAX_AVAILABLE);
  });

  it('quita y no baja de cero', () => {
    expect(sub.apply(10, 4)).toBe(6);
    expect(sub.apply(3, 10)).toBe(0);
  });

  it('poner en 0 ignora la cantidad y pide confirmación', () => {
    expect(zero.apply(80, 5)).toBe(0);
    expect(zero.needsQuantity).toBe(false);
    expect(zero.confirm?.(1)).toBe('¿Dejar en 0 el disponible de 1 producto?');
    expect(zero.confirm?.(3)).toBe('¿Dejar en 0 el disponible de 3 productos?');
  });

  it('solo acepta un entero entre 0 y el máximo', () => {
    expect(parseAvailable(' 12 ')).toBe(12);
    expect(parseAvailable('0')).toBe(0);
    expect(parseAvailable(String(MAX_AVAILABLE))).toBe(MAX_AVAILABLE);
    expect(parseAvailable('')).toBeNull();
    expect(parseAvailable('1.5')).toBeNull();
    expect(parseAvailable('-1')).toBeNull();
    expect(parseAvailable(String(MAX_AVAILABLE + 1))).toBeNull();
  });
});

describe('Textos de demora en el admin (DEV-15)', () => {
  const when = '2026-09-30T20:00:00.000Z';

  it('un pedido cancelado o sin hora estimada no muestra nada', () => {
    expect(orderTimingText({ status: 'cancelled', estimatedDeliveryAt: when, delayMinutes: 10 })).toEqual({
      eta: null,
      delay: null,
    });
    expect(orderTimingText({ status: 'preparing', estimatedDeliveryAt: null, delayMinutes: 10 })).toEqual({
      eta: null,
      delay: null,
    });
  });

  it('si sigue en curso y llegó tarde, dice demorado', () => {
    const text = orderTimingText({ status: 'on_the_way', estimatedDeliveryAt: when, delayMinutes: 12 });
    expect(text.eta?.startsWith('Llega aprox. ')).toBe(true);
    expect(text.delay).toBe('Demorado 12 min');
  });

  it('si se entregó tarde, dice cuánto se demoró', () => {
    const text = orderTimingText({ status: 'delivered', estimatedDeliveryAt: when, delayMinutes: 20 });
    expect(text.eta?.startsWith('Hora estimada: ')).toBe(true);
    expect(text.delay).toBe('Se demoró 20 min');
  });

  it('a tiempo no muestra demora', () => {
    expect(orderTimingText({ status: 'preparing', estimatedDeliveryAt: when, delayMinutes: 0 }).delay).toBeNull();
    expect(orderTimingText({ status: 'delivered', estimatedDeliveryAt: when, delayMinutes: null }).delay).toBeNull();
  });
});
