import { apiFetch } from './api';

export type User = {
  id: string;
  email: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateUserPayload = {
  role?: string;
  email?: string;
};

export async function listUsers(): Promise<User[]> {
  return apiFetch<User[]>('/api/users', { method: 'GET' });
}

export async function getUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, { method: 'GET' });
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}
