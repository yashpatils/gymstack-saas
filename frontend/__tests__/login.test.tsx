import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../app/login/page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const apiFetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('../src/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    apiFetchMock.mockReset();
    localStorage.clear();
  });

  it('submits credentials and redirects to the dashboard', async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accessToken: 'token-123' }),
    });

    render(<LoginPage />);

    await userEvent.type(
      screen.getByLabelText('Email'),
      'user@example.com',
    );
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password',
        }),
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('token-123');
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });
});
