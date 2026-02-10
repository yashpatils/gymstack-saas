import { apiFetch } from './api';

export type Gym = {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

type GymPayload = {
  name: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function listGyms(): Promise<Gym[]> {
  return request<Gym[]>('/gyms', { method: 'GET' });
}

export async function createGym(payload: GymPayload): Promise<Gym> {
  return request<Gym>('/gyms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGym(
  id: string,
  payload: Partial<GymPayload>,
): Promise<Gym> {
  return request<Gym>(`/gyms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGym(id: string): Promise<void> {
  await request<void>(`/gyms/${id}`, {
    method: 'DELETE',
  });
}
