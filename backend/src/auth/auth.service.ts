import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.controller';

type SignupInput = {
  email: string;
  password: string;
  tenantId: string;
  role?: string;
};

type LoginInput = {
  email: string;
  password: string;
  tenantId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(input: SignupInput): Promise<AuthenticatedUser> {
    const { email, password, tenantId, role } = input;

    if (!email || !password || !tenantId) {
      throw new BadRequestException('Email, password, and tenantId are required');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        tenantId,
        role: role ?? 'member',
        passwordHash,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
  }

  async login(input: LoginInput): Promise<{ accessToken: string }> {
    const { email, password, tenantId } = input;

    if (!email || !password || !tenantId) {
      throw new BadRequestException('Email, password, and tenantId are required');
    }

    const user = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }
}
