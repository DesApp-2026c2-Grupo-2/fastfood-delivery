import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'test' });
}

function catchCode(code: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new PrismaExceptionFilter().catch(prismaError(code), host);

  return {
    status: status.mock.calls[0][0] as number,
    body: json.mock.calls[0][0] as { statusCode: number; message: string; code?: string },
  };
}

describe('Errores de Prisma traducidos a HTTP', () => {
  it('un valor único repetido es 409', () => {
    const result = catchCode('P2002');
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      statusCode: 409,
      message: 'Ya existe un registro con ese valor único',
    });
  });

  it('un registro que ya no está es 404', () => {
    const result = catchCode('P2025');
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ statusCode: 404, message: 'Recurso no encontrado' });
  });

  it('una referencia inválida es 400', () => {
    const result = catchCode('P2003');
    expect(result.status).toBe(400);
    expect(result.body.message).toContain('Referencia inválida');
  });

  it.each(['P2021', 'P2022', 'P1001', 'P1017'])('un problema de esquema o de conexión (%s) es 500', (code) => {
    const result = catchCode(code);
    expect(result.status).toBe(500);
    expect(result.body.code).toBe(code);
    expect(result.body.message.length).toBeGreaterThan(0);
  });

  it('cualquier otro código de Prisma es un 500 genérico', () => {
    const result = catchCode('P9999');
    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      statusCode: 500,
      code: 'P9999',
      message: 'Error de base de datos',
    });
  });
});
