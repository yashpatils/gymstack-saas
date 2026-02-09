import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthController } from '../auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
    jwtService = moduleRef.get(JwtService);
  });

  it('returns success on signup', () => {
    expect(controller.signup({ email: 'test@example.com' })).toEqual({
      success: true,
    });
  });

  it('throws when login payload is missing', () => {
    expect(() => controller.login({ email: '', password: '' })).toThrow(
      BadRequestException,
    );
  });

  it('returns an access token on login', () => {
    const response = controller.login({
      email: 'test@example.com',
      password: 'password',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(response).toEqual({ accessToken: 'signed-token' });
  });

  it('returns the user email on me', () => {
    const response = controller.me({
      user: { email: 'test@example.com' },
    } as { user: { email: string } });

    expect(response).toEqual({ email: 'test@example.com' });
  });

  it('throws when user email is missing on me', () => {
    expect(() => controller.me({ user: {} } as { user: { email?: string } }))
      .toThrow(BadRequestException);
  });
});
