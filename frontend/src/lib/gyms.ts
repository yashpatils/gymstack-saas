import { apiFetch } from './api';

export type Gym = {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GymInput = {
  name: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, options);
}

export async function listGyms(): Promise<Gym[]> {
  return apiFetch<Gym[]>('/api/gyms', { method: 'GET' });
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
  await apiFetch(`/api/gyms/${id}`, {
    method: 'DELETE',
  });
}
