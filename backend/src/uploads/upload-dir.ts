import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function canUse(dir: string): boolean {
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveUploadsDir(): string {
  const preferred = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  if (canUse(preferred)) {
    return preferred;
  }

  const tmpDir = join('/tmp', 'uploads');
  if (canUse(tmpDir)) {
    return tmpDir;
  }

  return preferred;
}
