import { loadEnvFile, testDatabaseUrl, databaseName } from './test-database';

loadEnvFile();
const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  throw new Error('Falta DATABASE_URL. Los tests no arrancan contra la base de la aplicación.');
}
process.env.DATABASE_URL = testDatabaseUrl(raw);
const name = databaseName(process.env.DATABASE_URL);
if (!name.endsWith('_test')) {
  throw new Error('Los tests no pueden usar la base real');
}
