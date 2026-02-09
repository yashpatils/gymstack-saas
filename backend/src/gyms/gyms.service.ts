import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  listGyms() {
    return this.prisma.gym.findMany();
  }

  createGym(data: Record<string, unknown>) {
    return this.prisma.gym.create({ data });
  }

  getGym(id: string) {
    const gymId = Number(id);
    return this.prisma.gym.findUnique({ where: { id: gymId } });
  }

  updateGym(id: string, data: Record<string, unknown>) {
    const gymId = Number(id);
    return this.prisma.gym.update({
      where: { id: gymId },
      data,
    });
  }

  deleteGym(id: string) {
    const gymId = Number(id);
    return this.prisma.gym.delete({ where: { id: gymId } });
  }
}
