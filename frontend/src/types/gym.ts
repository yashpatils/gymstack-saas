export type Gym = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  displayName?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  customDomain?: string | null;
  domainVerifiedAt?: string | null;
  domainVerificationToken?: string | null;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateGymRequest = {
  name: string;
  timezone?: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
};

export type CreateGymResponse = Gym;
