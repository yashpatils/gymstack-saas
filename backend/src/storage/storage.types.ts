export type UploadInput = { key: string; content: Buffer; contentType: string };

export interface StorageService {
  upload(input: UploadInput): Promise<{ key: string }>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
