import { apiFetch } from './apiFetch';
import { track } from './analytics';
import type { CreateGymRequest, CreateGymResponse, Gym, SlugAvailabilityResult, UpdateGymRequest } from '../types/gym';

export type { Gym, CreateGymRequest as GymInput };

export async function listGyms(): Promise<Gym[]> {
  return apiFetch<Gym[]>('/api/gyms', { method: 'GET' });
}

export async function getGym(id: string): Promise<Gym> {
  return apiFetch<Gym>(`/api/gyms/${id}`, { method: 'GET' });
}

export async function createGym(payload: CreateGymRequest): Promise<CreateGymResponse> {
  const result = await apiFetch<CreateGymResponse>('/api/gyms', {
    method: 'POST',
    body: payload,
  });
  await track('create_location', { pageName: 'locations' });
  return result;
}

export async function checkGymSlugAvailability(slug: string): Promise<SlugAvailabilityResult> {
  return apiFetch<SlugAvailabilityResult>(`/api/gyms/slug-availability?slug=${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
}

export async function updateGym(id: string, payload: UpdateGymRequest): Promise<Gym> {
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
