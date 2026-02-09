import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany();
  }

  getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
