import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantSlugEditor } from '../src/components/settings/TenantSlugEditor';

const checkTenantSlugAvailabilityMock = vi.fn();

vi.mock('../src/lib/tenants', () => ({
  checkTenantSlugAvailability: (...args: unknown[]) => checkTenantSlugAvailabilityMock(...args),
  requestTenantSlugChange: vi.fn(),
  resendTenantSlugChangeOtp: vi.fn(),
  verifyTenantSlugChange: vi.fn(),
}));

vi.mock('../src/components/toast/ToastProvider', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe('TenantSlugEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    checkTenantSlugAvailabilityMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores stale availability responses', async () => {
    checkTenantSlugAvailabilityMock
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ slug: 'first', validFormat: true, available: true, reserved: false }), 100)))
      .mockResolvedValueOnce({ slug: 'second', validFormat: true, available: true, reserved: false });

    render(
      <TenantSlugEditor
        tenantId="t1"
        currentSlug="current"
        canEdit
        featureEnabled
      />,
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByLabelText('Slug');
    await user.clear(input);
    await user.type(input, 'first');
    await vi.advanceTimersByTimeAsync(500);

    await user.clear(input);
    await user.type(input, 'second');
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(120);

    await waitFor(() => {
      expect(screen.getByText('Available: second')).toBeInTheDocument();
    });
  });
});
