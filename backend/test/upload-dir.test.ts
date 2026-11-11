import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { resolveUploadsDir } from '../src/uploads/upload-dir';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const exists = existsSync as jest.Mock;
const mkdir = mkdirSync as jest.Mock;

describe('carpeta de imágenes', () => {
  const original = process.env.UPLOADS_DIR;

  afterEach(() => {
    if (original === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = original;
  });

  it('usa la carpeta configurada si se puede crear', () => {
    process.env.UPLOADS_DIR = 'D:\\mordi-uploads';
    exists.mockReturnValue(false);
    mkdir.mockImplementation(() => undefined);
    expect(resolveUploadsDir()).toBe('D:\\mordi-uploads');
  });

  it('si la carpeta configurada falla, usa /tmp', () => {
    process.env.UPLOADS_DIR = 'D:\\mordi-uploads';
    const tmp = join('/tmp', 'uploads');
    exists.mockReturnValue(false);
    mkdir.mockImplementation((dir: string) => {
      if (dir !== tmp) throw new Error('sin permiso');
    });
    expect(resolveUploadsDir()).toBe(tmp);
  });

  it('si tampoco puede usar /tmp, vuelve a la carpeta configurada', () => {
    process.env.UPLOADS_DIR = 'D:\\mordi-uploads';
    exists.mockReturnValue(false);
    mkdir.mockImplementation(() => {
      throw new Error('sin permiso');
    });
    expect(resolveUploadsDir()).toBe('D:\\mordi-uploads');
  });
});
