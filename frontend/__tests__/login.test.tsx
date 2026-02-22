import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../app/login/page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const loginMock = vi.fn();
const verifyLoginOtpMock = vi.fn();
const resendLoginOtpMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../src/providers/AuthProvider', () => ({
  useAuth: () => ({
    login: loginMock,
    loading: false,
    isHydrating: false,
    authStatus: 'unauthenticated',
    platformRole: null,
    user: null,
  }),
}));

vi.mock('../src/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/auth')>();
  return {
    ...actual,
    verifyLoginOtp: verifyLoginOtpMock,
    resendLoginOtp: resendLoginOtpMock,
    me: vi.fn(),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loginMock.mockReset();
    verifyLoginOtpMock.mockReset();
    resendLoginOtpMock.mockReset();
  });

  it('switches to OTP step when login returns OTP_REQUIRED', async () => {
    loginMock.mockResolvedValue({
      status: 'OTP_REQUIRED',
      challengeId: 'challenge-1',
      channel: 'email',
      expiresAt: '2026-01-01T00:00:00.000Z',
      maskedEmail: 't***@example.com',
    });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify code' })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('verifies OTP and reuses redirect logic', async () => {
    loginMock.mockResolvedValue({
      status: 'OTP_REQUIRED',
      challengeId: 'challenge-1',
      channel: 'email',
      expiresAt: '2026-01-01T00:00:00.000Z',
      maskedEmail: 't***@example.com',
    });
    verifyLoginOtpMock.mockResolvedValue({
      status: 'SUCCESS',
      token: 'token-1',
      user: { id: 'u1', email: 'user@example.com' },
      memberships: [{ id: 'm1', tenantId: 't1', role: 'TENANT_OWNER', status: 'ACTIVE' }],
    });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    await waitFor(() => {
      expect(verifyLoginOtpMock).toHaveBeenCalledWith('challenge-1', '123456');
      expect(pushMock).toHaveBeenCalledWith('/platform/context');
    });
  });
});
