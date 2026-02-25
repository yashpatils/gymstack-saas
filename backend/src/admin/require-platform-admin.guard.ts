import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowlistedPlatformAdminEmail } from '../auth/platform-admin.util';

type AuthenticatedRequestUser = {
  userId?: string;
  id?: string;
  sub?: string;
};

function resolveUserId(user?: AuthenticatedRequestUser): string | null {
  return user?.userId ?? user?.id ?? user?.sub ?? null;
}

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedRequestUser }>();
    const userId = resolveUserId(request.user);

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      throw new ForbiddenException({ code: 'ADMIN_ONLY', message: 'Access restricted' });
    }

    const isPlatformAdmin = isAllowlistedPlatformAdminEmail(this.configService, user.email);
    if (!isPlatformAdmin) {
      throw new ForbiddenException({ code: 'ADMIN_ONLY', message: 'Access restricted' });
    }

    return true;
  }
}
