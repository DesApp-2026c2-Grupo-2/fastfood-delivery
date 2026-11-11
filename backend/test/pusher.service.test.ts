import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import Pusher from 'pusher';
import { JwtPayload } from '../src/auth/jwt-payload';
import { ADMIN_ORDERS_CHANNEL, ORDER_STATUS_EVENT, userOrdersChannel } from '../src/realtime/channels';
import { PusherService } from '../src/realtime/pusher.service';

jest.mock('pusher', () =>
  jest.fn().mockImplementation(() => ({
    authorizeChannel: jest.fn().mockReturnValue({ auth: 'signed' }),
    trigger: jest.fn().mockResolvedValue(undefined),
  })),
);

const admin: JwtPayload = { sub: 'admin-1', email: 'admin@rapido.local', role: Role.admin };
const customer: JwtPayload = { sub: 'cliente-1', email: 'ana@rapido.local', role: Role.customer };

const event = {
  orderId: 'pedido-1',
  userId: 'cliente-1',
  status: 'preparing' as const,
  previousStatus: 'pending' as const,
  changedAt: '2026-11-11T18:00:00.000Z',
};

function service(values: Record<string, string | undefined>) {
  const config = { get: (key: string) => values[key] } as ConfigService;
  return new PusherService(config);
}

function lastClient() {
  const results = (Pusher as unknown as jest.Mock).mock.results;
  return results[results.length - 1].value as {
    authorizeChannel: jest.Mock;
    trigger: jest.Mock;
  };
}

const configured = {
  PUSHER_APP_ID: 'app',
  PUSHER_KEY: 'key',
  PUSHER_SECRET: 'secret',
  PUSHER_CLUSTER: 'mt1',
};

describe('Pusher', () => {
  it('sin credenciales no publica ni deja suscribirse', async () => {
    const pusher = service({});

    expect(pusher.isEnabled()).toBe(false);
    expect(pusher.publicConfig()).toEqual({ enabled: false });
    expect(() => pusher.authorize(admin, '1.1', ADMIN_ORDERS_CHANNEL)).toThrow('Pusher no está configurado');
    await expect(pusher.publishOrderStatus(event)).resolves.toBeUndefined();
    expect(Pusher).not.toHaveBeenCalled();
  });

  it('con credenciales firma el canal que le corresponde a cada rol', () => {
    const pusher = service(configured);
    const client = lastClient();

    expect(pusher.isEnabled()).toBe(true);
    expect(pusher.publicConfig()).toEqual({ enabled: true, key: 'key', cluster: 'mt1' });

    expect(pusher.authorize(admin, '1.1', ADMIN_ORDERS_CHANNEL)).toEqual({ auth: 'signed' });
    expect(client.authorizeChannel).toHaveBeenCalledWith('1.1', ADMIN_ORDERS_CHANNEL);

    expect(pusher.authorize(customer, '2.2', userOrdersChannel(customer.sub))).toEqual({ auth: 'signed' });
    expect(() => pusher.authorize(admin, '1.1', userOrdersChannel(customer.sub))).toThrow(
      'No podés suscribirte a ese canal',
    );
    expect(() => pusher.authorize(customer, '2.2', ADMIN_ORDERS_CHANNEL)).toThrow(
      'No podés suscribirte a ese canal',
    );
    expect(() =>
      pusher.authorize({ ...customer, role: 'otro' as Role }, '3.3', ADMIN_ORDERS_CHANNEL),
    ).toThrow('No podés suscribirte a ese canal');
  });

  it('publica el cambio de estado al admin y, si hay cliente, también a su canal', async () => {
    const pusher = service(configured);
    const client = lastClient();

    await pusher.publishOrderStatus(event);
    expect(client.trigger).toHaveBeenCalledWith(
      [ADMIN_ORDERS_CHANNEL, userOrdersChannel('cliente-1')],
      ORDER_STATUS_EVENT,
      event,
    );

    await pusher.publishOrderStatus({ ...event, userId: null });
    expect(client.trigger).toHaveBeenLastCalledWith([ADMIN_ORDERS_CHANNEL], ORDER_STATUS_EVENT, {
      ...event,
      userId: null,
    });
  });

  it('si Pusher rechaza el envío, el pedido igual sigue: solo queda el error en el log', async () => {
    const pusher = service(configured);
    const client = lastClient();
    client.trigger.mockRejectedValueOnce(new Error('red'));
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(pusher.publishOrderStatus(event)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
