import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        gymName: input.gymName.trim(),
        size: input.size.trim(),
      },
    });
  }
}
