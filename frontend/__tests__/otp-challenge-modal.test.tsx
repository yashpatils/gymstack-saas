import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpChallengeModal } from '../src/components/settings/OtpChallengeModal';

describe('OtpChallengeModal', () => {
  it('sanitizes OTP input and enables verify at 6 digits', async () => {
    const verify = vi.fn().mockResolvedValue(undefined);

    render(
      <OtpChallengeModal
        open
        title="Confirm"
        challengeId="c1"
        expiresAt="2027-01-01T00:00:00.000Z"
        onClose={vi.fn()}
        onVerify={verify}
        onResend={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const input = screen.getByLabelText('Verification code');
    await userEvent.type(input, '12ab34567');
    expect(input).toHaveValue('123456');

    await userEvent.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(verify).toHaveBeenCalledWith('123456');
  });
});
