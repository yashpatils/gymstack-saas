import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeRole } from './role.util';

type JwtPayload = {
  sub: string;
  id?: string;
  email: string;
  role: string;
  orgId?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

  async validate(payload: JwtPayload): Promise<{
    id: string;
    email: string;
    role: string;
    orgId: string;
  }> {
    const userId = payload.id ?? payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });

    return {
      id: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      orgId: membership?.orgId ?? payload.orgId ?? '',
    };
  }
}
