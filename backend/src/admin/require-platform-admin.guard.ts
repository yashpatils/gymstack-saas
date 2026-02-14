import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowlistedPlatformAdminEmail } from '../auth/platform-admin.util';

type AuthenticatedRequestUser = {
  userId?: string;
  id?: string;
  sub?: string;
};

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedRequestUser }>();
    const userId = request.user?.userId ?? request.user?.id ?? request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Platform admin access is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const isPlatformAdmin = isAllowlistedPlatformAdminEmail(this.configService, user?.email);
    if (!isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access is required');
    }

    return true;
  }
}
