import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MembershipRole, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(input: SignupDto): Promise<{ accessToken: string; user: MeDto }> {
    const { email, password, role } = input;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          role: role ?? Role.USER,
          password: passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: `${email.split('@')[0]}'s Organization`,
        },
      });

      const membership = await tx.membership.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          role: MembershipRole.OWNER,
        },
      });

      return { user, membership };
    });

    const payload = {
      sub: created.user.id,
      id: created.user.id,
      email: created.user.email,
      role: created.user.role,
      orgId: created.membership.orgId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: created.user.id,
        email: created.user.email,
        role: created.user.role,
        orgId: created.membership.orgId,
      },
    };
  }

  async login(input: LoginDto): Promise<{ accessToken: string; user: MeDto }> {
    const { email, password } = input;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId: user.id },
    });

    if (!membership) {
      throw new UnauthorizedException('User has no organization membership');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: membership.orgId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: membership.orgId,
      },
    };
  }
}
