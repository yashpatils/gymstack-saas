import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../app/settings/page';
import OrganizationSettingsPage from '../app/settings/organization/page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const authState = {
  isAuthenticated: true,
  permissions: { canManageTenant: false },
  activeContext: { tenantId: 'tenant-1', locationId: null, gymId: null, role: 'GYM_STAFF_COACH' },
  memberships: [
    { id: 'm-1', tenantId: 'tenant-1', role: 'GYM_STAFF_COACH', status: 'ACTIVE', locationId: null, gymId: null },
  ],
};

vi.mock('../src/providers/AuthProvider', () => ({
  useAuth: () => authState,
}));

const apiFetchMock = vi.fn();
vi.mock('../src/lib/apiFetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  ApiFetchError: class ApiFetchError extends Error {
    statusCode: number;
    constructor(statusCode: number) {
      super('api error');
      this.statusCode = statusCode;
    }
  },
}));

describe('settings routes', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ id: 'u1', name: 'Coach', email: 'coach@example.com', twoStepEmailEnabled: false });
  });

  it('coach can open /settings and sees Profile + Security tabs', async () => {
    render(<SettingsPage />);

    expect(await screen.findByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
  });

  it('coach cannot access /settings/organization', async () => {
    render(<OrganizationSettingsPage />);

    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
  });
});
