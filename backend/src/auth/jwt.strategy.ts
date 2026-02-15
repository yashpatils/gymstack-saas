import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MembershipRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveEffectivePermissions } from './authorization';

interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role?: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
  activeMode?: 'OWNER' | 'MANAGER';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;

    if (!secret) {
      const logger = new Logger(JwtStrategy.name);
      logger.warn('JWT_SECRET is not defined. Falling back to dev secret for local startup.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { permissions: string[] }> {
    const permissions = payload.activeTenantId
      ? await resolveEffectivePermissions(this.prisma, payload.sub, payload.activeTenantId, payload.activeGymId)
      : [];

    return { ...payload, permissions };
  }
}
