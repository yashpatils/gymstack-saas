import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany();
  }

  getUser(id: string) {
    const userId = Number(id);
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  updateUser(id: string, data: Record<string, unknown>) {
    const userId = Number(id);
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  deleteUser(id: string) {
    const userId = Number(id);
    return this.prisma.user.delete({ where: { id: userId } });
  }
}
