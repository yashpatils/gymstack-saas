export type LocationBrandingUpdateInput = {
  slug?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
};

export type LocationSettingsResponse = {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  primaryColor: string | null;
  accentGradient: string | null;
  customDomain: string | null;
  domainVerifiedAt: string | null;
  tenant: {
    id: string;
    whiteLabelEnabled: boolean;
  };
};

export type LocationDomainSetupResponse = {
  locationId: string;
  customDomain: string | null;
  status: 'pending' | 'verified';
  txtRecord: {
    name: string;
    value: string;
  };
  instructions: string;
  message?: string;
};
