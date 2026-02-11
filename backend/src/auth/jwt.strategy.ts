import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { normalizeRole } from './role.util';

type JwtPayload = {
  sub: string;
  id?: string;
  email: string;
  role: string;
  orgId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    // JWT_SECRET must be supplied via environment variables (e.g. Railway service variables).
    const secret = configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_SECRET is required and must be provided via environment variables before starting the backend.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): {
    id: string;
    email: string;
    role: string;
    orgId: string;
  } {
    return {
      id: payload.id ?? payload.sub,
      email: payload.email,
      role: normalizeRole(payload.role),
      orgId: payload.orgId,
    };
  }
}
