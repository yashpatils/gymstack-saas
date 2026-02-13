export type Gym = {
  id: string;
  name: string;
  timezone: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
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
