import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../app/dashboard/page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    localStorage.clear();
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.unstubAllGlobals();
  });

  it('loads the profile and renders the welcome message', async () => {
    localStorage.setItem('accessToken', 'token-123');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'user@example.com' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/auth/me',
        {
          headers: {
            Authorization: 'Bearer token-123',
          },
        },
      );
    });

    expect(
      await screen.findByText('Welcome, user@example.com'),
    ).toBeInTheDocument();
  });
});
