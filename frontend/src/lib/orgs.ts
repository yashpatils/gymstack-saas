import { apiFetch } from './apiFetch';

export type OrgSummary = {
  id: string;
  name: string;
  createdAt: string;
  role: string;
};

export type OrgDetail = {
  id: string;
  name: string;
  createdAt: string;
  whiteLabelEnabled: boolean;
  billingProvider: string;
};

export function listOrgs() {
  return apiFetch<OrgSummary[]>('/api/orgs');
}

export function getOrg(id: string) {
  return apiFetch<OrgDetail>(`/api/orgs/${id}`);
}

export function updateOrg(id: string, payload: { name: string }) {
  return apiFetch<OrgDetail>(`/api/orgs/${id}`, { method: 'PATCH', body: payload });
}
