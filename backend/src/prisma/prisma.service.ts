import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL. En Vercel: Project Settings → Environment Variables. En Neon, usá la URL pooled con ?sslmode=require',
    );
  }
  if (url.includes('sslmode=')) {
    return url;
  }
  if (url.includes('neon.tech')) {
    return `${url}${url.includes('?') ? '&' : '?'}sslmode=require`;
  }
  return url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: { url: databaseUrl() },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
