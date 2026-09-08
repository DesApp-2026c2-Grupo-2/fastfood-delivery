import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { resolveUploadsDir } from './uploads/upload-dir';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadsDir = resolveUploadsDir();
  if (existsSync(uploadsDir)) {
    app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  }
  app.setGlobalPrefix('api');
  app.getHttpAdapter().get('/', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'mordi-api', api: '/api' });
  });
  const extraOrigins = (
    process.env.FRONTEND_ORIGIN ??
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const localDev = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      const vercelApp = /^https:\/\/[\w.-]+\.vercel\.app$/.test(origin);
      callback(null, localDev || vercelApp || extraOrigins.includes(origin));
    },
    credentials: true,
  });
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API lista en http://localhost:${port}/api`);
}

void bootstrap();
