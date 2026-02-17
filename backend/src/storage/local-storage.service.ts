import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { StorageService, UploadInput } from './storage.types';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly basePath = process.env.LOCAL_STORAGE_PATH ?? 'var/storage';

  async upload(input: UploadInput): Promise<{ key: string }> {
    const targetPath = join(this.basePath, input.key);
    await mkdir(join(targetPath, '..'), { recursive: true });
    await writeFile(targetPath, input.content);
    return { key: input.key };
  }

  async delete(key: string): Promise<void> {
    const targetPath = join(this.basePath, key);
    await unlink(targetPath).catch(() => undefined);
  }

  getPublicUrl(key: string): string {
    const baseUrl = process.env.PUBLIC_STORAGE_BASE_URL ?? 'http://localhost:3000/storage';
    return `${baseUrl.replace(/\/$/, '')}/${key}`;
  }
}
