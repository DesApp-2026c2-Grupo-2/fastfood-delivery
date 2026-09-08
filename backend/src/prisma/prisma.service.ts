import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function databaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      'Falta DATABASE_URL. En Vercel: Project Settings → Environment Variables. En Neon, usá la URL pooled con ?sslmode=require',
    );
  }

  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete('channel_binding');
    if (parsed.hostname.includes('neon.tech')) {
      if (!parsed.searchParams.get('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
      if (!parsed.searchParams.get('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '20');
      }
      if (!parsed.searchParams.get('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '20');
      }
    }
    return parsed.toString();
  } catch {
    return raw;
  }
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
