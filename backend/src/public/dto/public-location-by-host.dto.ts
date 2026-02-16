export class PublicHostLocationDto {
  id!: string;
  slug!: string;
  displayName!: string | null;
  logoUrl!: string | null;
  primaryColor!: string | null;
  accentGradient!: string | null;
  heroTitle!: string | null;
  heroSubtitle!: string | null;
}

export class PublicHostTenantDto {
  id!: string;
  whiteLabelEnabled!: boolean;
}

export class PublicLocationByHostResponseDto {
  location!: PublicHostLocationDto | null;
  tenant!: PublicHostTenantDto | null;
}
