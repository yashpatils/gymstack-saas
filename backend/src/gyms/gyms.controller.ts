import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GymsService } from './gyms.service';

@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  listGyms() {
    return this.gymsService.listGyms();
  }

  @Post()
  createGym(@Body() data: Prisma.GymCreateInput) {
    return this.gymsService.createGym(data);
  }

  @Get(':id')
  getGym(@Param('id') id: string) {
    return this.gymsService.getGym(id);
  }

  @Patch(':id')
  updateGym(
    @Param('id') id: string,
    @Body() data: Prisma.GymUpdateInput,
  ) {
    return this.gymsService.updateGym(id, data);
  }

  @Delete(':id')
  deleteGym(@Param('id') id: string) {
    return this.gymsService.deleteGym(id);
  }
}
