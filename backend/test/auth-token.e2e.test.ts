import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

// Las env vars pisan al .env: así el test no depende de la vigencia que tenga cada uno.
process.env.JWT_EXPIRES_IN = '2h';

const EMAIL_PREFIX = 'token.e2e.';

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let jwt: JwtService;

beforeAll(async () => {
  app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  server = app.getHttpServer();
  prisma = app.get(PrismaService);
  jwt = app.get(JwtService);
}, 30_000);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await app.close();
});

async function registerCustomer() {
  const email = `${EMAIL_PREFIX}${Date.now()}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
  const response = await request(server)
    .post('/api/auth/register')
    .send({ email, name: 'Token E2E', password: 'Cliente123!' });
  expect(response.status).toBe(201);
  return {
    email,
    id: response.body.user.id as string,
    token: response.body.accessToken as string,
  };
}

describe('JWT: emisión', () => {
  it('el token dura lo que dice JWT_EXPIRES_IN', async () => {
    const { token } = await registerCustomer();
    const claims = jwt.decode(token) as { iat: number; exp: number };
    expect(claims.exp - claims.iat).toBe(2 * 60 * 60);
  });

  it('login con credenciales inválidas responde 401 (el front no lo confunde con sesión vencida)', async () => {
    const { email } = await registerCustomer();
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'incorrecta' });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciales inválidas');
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario de la sesión con un token válido', async () => {
    const { email, id, token } = await registerCustomer();
    const response = await request(server).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, email, name: 'Token E2E', role: 'customer' });
  });

  it('acepta el esquema Bearer sin distinguir mayúsculas', async () => {
    const { token } = await registerCustomer();
    const response = await request(server).get('/api/auth/me').set('Authorization', `bearer ${token}`);
    expect(response.status).toBe(200);
  });

  it('401 sin header Authorization', async () => {
    const response = await request(server).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token requerido');
  });

  it('401 con otro esquema de autenticación', async () => {
    const response = await request(server).get('/api/auth/me').set('Authorization', 'Basic YWJjOmRlZg==');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token requerido');
  });

  it('401 con un token que no es un JWT', async () => {
    const response = await request(server).get('/api/auth/me').set('Authorization', 'Bearer no-es-un-jwt');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token inválido');
  });

  it('401 con un token firmado con otro secreto', async () => {
    const { email, id } = await registerCustomer();
    const forged = new JwtService({ secret: 'otro-secreto' }).sign({ sub: id, email, role: 'customer' });
    const response = await request(server).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token inválido');
  });

  it('401 con un token vencido, y lo dice', async () => {
    const { email, id } = await registerCustomer();
    const expired = jwt.sign({ sub: id, email, role: 'customer' }, { expiresIn: -10 });
    const response = await request(server).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('La sesión expiró');
  });

  it('401 si el usuario del token ya no existe', async () => {
    const { id, token } = await registerCustomer();
    await prisma.user.delete({ where: { id } });

    const response = await request(server).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token inválido');
  });
});

describe('rutas protegidas', () => {
  it('un token válido de un usuario borrado da 401 (antes: 400 por la FK del carrito)', async () => {
    const { id, token } = await registerCustomer();
    await prisma.user.delete({ where: { id } });

    const response = await request(server).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('el rol sale de la base y no del token: un claim viejo de admin no da acceso', async () => {
    const { email, id } = await registerCustomer();
    const staleAdminToken = jwt.sign({ sub: id, email, role: 'admin' });

    const response = await request(server)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${staleAdminToken}`);
    expect(response.status).toBe(403);
  });
});
