import { databaseUrl } from '../src/prisma/prisma.service';

describe('DATABASE_URL', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('sin variable no arranca', () => {
    delete process.env.DATABASE_URL;
    expect(() => databaseUrl()).toThrow('Falta DATABASE_URL');
  });

  it('si no es una URL, la deja como vino', () => {
    process.env.DATABASE_URL = 'no-es-una-url';
    expect(databaseUrl()).toBe('no-es-una-url');
  });

  it('en Neon completa ssl y los timeouts, y saca channel_binding', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@ep-abc.neon.tech/db?channel_binding=require';
    const url = new URL(databaseUrl());
    expect(url.searchParams.get('channel_binding')).toBeNull();
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('connect_timeout')).toBe('20');
    expect(url.searchParams.get('pool_timeout')).toBe('20');
  });

  it('en Neon no pisa ssl ni timeouts que ya venían', () => {
    process.env.DATABASE_URL =
      'postgresql://u:p@ep-abc.neon.tech/db?sslmode=verify-full&connect_timeout=5&pool_timeout=8';
    const url = new URL(databaseUrl());
    expect(url.searchParams.get('sslmode')).toBe('verify-full');
    expect(url.searchParams.get('connect_timeout')).toBe('5');
    expect(url.searchParams.get('pool_timeout')).toBe('8');
  });
});
