export type PublicHostLocation = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentGradient: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
};

export type PublicHostTenant = {
  id: string;
  whiteLabelEnabled: boolean;
};

export type PublicLocationByHostResponse = {
  location: PublicHostLocation | null;
  tenant: PublicHostTenant | null;
};
