import { BadRequestException } from '@nestjs/common';
import { SettingsController } from './settings.controller';

describe('SettingsController sensitive updates', () => {
  const service = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    changeMyPassword: jest.fn(),
    getOrganizationSettings: jest.fn(),
    updateOrganizationSettings: jest.fn(),
    getLocationSettings: jest.fn(),
    updateLocationSettings: jest.fn(),
  } as never;

  const controller = new SettingsController(service);

  it('direct password change without OTP never applies', () => {
    expect(() => controller.changeMyPassword({ user: { id: 'u1' } }, { currentPassword: 'old', newPassword: 'new' })).toThrow(BadRequestException);
    expect((service as any).changeMyPassword).not.toHaveBeenCalled();
  });
});
