import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys!: SubscriptionKeysDto;
}

