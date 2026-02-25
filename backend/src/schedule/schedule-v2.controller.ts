import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { ScheduleService } from './schedule.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { BookSessionDto, CreateSessionDto, DateRangeQueryDto, UpdateSessionDto } from './dto/session.dto';

type AuthenticatedRequest = {
  user?: {
    id: string;
    orgId?: string;
    activeTenantId?: string;
    activeGymId?: string;
  };
};

@Controller()
@VerifiedEmailRequired()
@UseGuards(RolesGuard, PermissionsGuard)
export class ScheduleV2Controller {
  constructor(private readonly scheduleService: ScheduleService) {}

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return req.user;
  }

  @Post('gyms/:gymId/classes')
  createClass(@Req() req: AuthenticatedRequest, @Param('gymId') gymId: string, @Body() body: CreateClassDto) {
    return this.scheduleService.createClassForGym(this.requireUser(req), gymId, body);
  }

  @Get('gyms/:gymId/classes')
  listClasses(@Req() req: AuthenticatedRequest, @Param('gymId') gymId: string) {
    return this.scheduleService.listClassesByGym(this.requireUser(req), gymId);
  }

  @Patch('classes/:id')
  updateClass(@Req() req: AuthenticatedRequest, @Param('id') classId: string, @Body() body: UpdateClassDto) {
    return this.scheduleService.updateClassById(this.requireUser(req), classId, body);
  }

  @Post('classes/:id/sessions')
  createSession(@Req() req: AuthenticatedRequest, @Param('id') classId: string, @Body() body: Omit<CreateSessionDto, 'classId'>) {
    return this.scheduleService.createSessionForClass(this.requireUser(req), classId, body);
  }

  @Get('gyms/:gymId/sessions')
  listSessions(@Req() req: AuthenticatedRequest, @Param('gymId') gymId: string, @Query() query: DateRangeQueryDto) {
    return this.scheduleService.listSessionsByGym(this.requireUser(req), gymId, query);
  }

  @Patch('sessions/:id')
  updateSession(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string, @Body() body: UpdateSessionDto) {
    return this.scheduleService.updateSession(this.requireUser(req), sessionId, body);
  }

  @Post('sessions/:id/book')
  book(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string, @Body() body: BookSessionDto) {
    return this.scheduleService.bookSessionV2(this.requireUser(req), sessionId, body);
  }

  @Post('bookings/:id/cancel')
  cancelBooking(@Req() req: AuthenticatedRequest, @Param('id') bookingId: string) {
    return this.scheduleService.cancelBookingById(this.requireUser(req), bookingId);
  }

  @Post('bookings/:id/checkin')
  checkIn(@Req() req: AuthenticatedRequest, @Param('id') bookingId: string) {
    return this.scheduleService.checkInBookingById(this.requireUser(req), bookingId);
  }
}
