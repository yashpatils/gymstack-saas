import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MembershipRole } from '@prisma/client';
import { resolvePermissions } from './permissions';

interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role?: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      const logger = new Logger(JwtStrategy.name);
      logger.warn('JWT_SECRET is not defined. Falling back to dev secret for local startup.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret ?? 'dev-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload & { permissions: string[] } {
    return { ...payload, permissions: payload.activeRole ? resolvePermissions(payload.activeRole) : [] };
  }
}
