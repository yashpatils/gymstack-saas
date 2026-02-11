import { apiFetch } from './api';

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

export type GymInput = {
  name: string;
  timezone?: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export async function listGyms(): Promise<Gym[]> {
  return apiFetch<Gym[]>('/api/gyms', { method: 'GET' });
}

export async function getGym(id: string): Promise<Gym> {
  return apiFetch<Gym>(`/api/gyms/${id}`, { method: 'GET' });
}

export async function createGym(payload: GymInput): Promise<Gym> {
  return apiFetch<Gym>('/api/gyms', {
    method: 'POST',
    body: payload,
  });
}

export async function updateGym(id: string, payload: GymInput): Promise<Gym> {
  return apiFetch<Gym>(`/api/gyms/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteGym(id: string): Promise<void> {
  await apiFetch<void>(`/api/gyms/${id}`, {
    method: 'DELETE',
  });
}
