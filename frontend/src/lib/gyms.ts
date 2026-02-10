import { buildApiUrl } from './api';

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

function getAuthHeaders(): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('accessToken')
      : null;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // fall back to default message
    }

    throw new Error(message);
  }

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

export async function updateGym(id: string, payload: Partial<GymPayload>): Promise<Gym> {
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
