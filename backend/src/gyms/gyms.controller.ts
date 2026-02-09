import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { GymsService } from './gyms.service';

@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  listGyms() {
    return this.gymsService.listGyms();
  }

  @Post()
  createGym(@Body() data: Record<string, unknown>) {
    return this.gymsService.createGym(data);
  }

  @Get(':id')
  getGym(@Param('id') id: string) {
    return this.gymsService.getGym(id);
  }

  @Patch(':id')
  updateGym(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.gymsService.updateGym(id, data);
  }

  @Delete(':id')
  deleteGym(@Param('id') id: string) {
    return this.gymsService.deleteGym(id);
  }
}
