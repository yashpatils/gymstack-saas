import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3CompatibleStorageService } from './s3-compatible-storage.service';

@Module({
  providers: [
    LocalStorageService,
    S3CompatibleStorageService,
    {
      provide: 'StorageService',
      useFactory: (local: LocalStorageService, s3: S3CompatibleStorageService) => {
        return process.env.STORAGE_BACKEND === 's3' ? s3 : local;
      },
      inject: [LocalStorageService, S3CompatibleStorageService],
    },
  ],
  exports: ['StorageService'],
})
export class StorageModule {}
