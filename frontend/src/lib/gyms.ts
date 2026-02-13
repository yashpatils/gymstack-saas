import { apiFetch } from './api';
import type { CreateGymRequest, CreateGymResponse, Gym } from '../types/gym';

export type { Gym, CreateGymRequest as GymInput };

export async function listGyms(): Promise<Gym[]> {
  return apiFetch<Gym[]>('/api/gyms', { method: 'GET' });
}

export async function getGym(id: string): Promise<Gym> {
  return apiFetch<Gym>(`/api/gyms/${id}`, { method: 'GET' });
}

export async function createGym(payload: CreateGymRequest): Promise<CreateGymResponse> {
  return apiFetch<CreateGymResponse>('/api/gyms', {
    method: 'POST',
    body: payload,
  });
}

export async function updateGym(id: string, payload: CreateGymRequest): Promise<Gym> {
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
