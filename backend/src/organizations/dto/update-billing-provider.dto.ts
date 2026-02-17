import { BillingProvider } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateBillingProviderDto {
  @IsEnum(BillingProvider)
  billingProvider!: BillingProvider;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  billingCountry?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  billingCurrency?: string;
}
