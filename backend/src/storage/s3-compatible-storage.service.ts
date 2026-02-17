import { Injectable } from '@nestjs/common';
import { StorageService, UploadInput } from './storage.types';

@Injectable()
export class S3CompatibleStorageService implements StorageService {
  async upload(input: UploadInput): Promise<{ key: string }> {
    if (!process.env.S3_BUCKET) {
      throw new Error('S3_BUCKET is required for s3-compatible storage');
    }
    return { key: input.key };
  }

  async delete(_key: string): Promise<void> {
    return;
  }

  getPublicUrl(key: string): string {
    const endpoint = process.env.S3_PUBLIC_BASE_URL ?? '';
    return `${endpoint.replace(/\/$/, '')}/${key}`;
  }
}
