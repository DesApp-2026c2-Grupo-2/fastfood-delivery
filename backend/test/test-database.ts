import { readFileSync } from 'fs';
import { resolve } from 'path';

/** Carga el .env sin pisar variables que ya vengan del entorno. */
export function loadEnvFile() {
  const text = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}

/** La base de los tests es la de la app con el sufijo _test. Nunca es la real. */
export function testDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  const name = databaseName(raw);
  if (!/^[A-Za-z0-9_]+$/.test(name) || name === 'postgres') {
    throw new Error('DATABASE_URL no tiene un nombre de base usable para los tests');
  }
  if (!name.endsWith('_test')) {
    url.pathname = `/${name}_test`;
  }
  return url.toString();
}
