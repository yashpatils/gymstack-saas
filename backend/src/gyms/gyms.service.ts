import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  listGyms() {
    return this.prisma.gym.findMany();
  }

  createGym(data: Prisma.GymCreateInput) {
    return this.prisma.gym.create({ data });
  }

  getGym(id: string) {
    return this.prisma.gym.findUnique({ where: { id } });
  }

  updateGym(id: string, data: Prisma.GymUpdateInput) {
    return this.prisma.gym.update({
      where: { id },
      data,
    });
  }

  deleteGym(id: string) {
    return this.prisma.gym.delete({ where: { id } });
  }
}
