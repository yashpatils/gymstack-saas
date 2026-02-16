import { Module } from '@nestjs/common';
import { LocationAppController } from './location-app.controller';
import { LocationAppService } from './location-app.service';

@Module({
  controllers: [LocationAppController],
  providers: [LocationAppService],
})
export class LocationAppModule {}
