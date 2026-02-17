import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { ScheduleService } from './schedule.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { CheckInDto, CreateSessionDto, DateRangeQueryDto } from './dto/session.dto';

type AuthenticatedRequest = {
  user?: {
    id: string;
    orgId?: string;
    activeTenantId?: string;
    activeGymId?: string;
  };
};

@Controller('location')
@VerifiedEmailRequired()
@UseGuards(RolesGuard, PermissionsGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return req.user;
  }

  @Get('classes')
  listClasses(@Req() req: AuthenticatedRequest) {
    return this.scheduleService.listClasses(this.requireUser(req));
  }

  @Post('classes')
  createClass(@Req() req: AuthenticatedRequest, @Body() body: CreateClassDto) {
    return this.scheduleService.createClass(this.requireUser(req), body);
  }

  @Patch('classes/:classId')
  updateClass(@Req() req: AuthenticatedRequest, @Param('classId') classId: string, @Body() body: UpdateClassDto) {
    return this.scheduleService.updateClass(this.requireUser(req), classId, body);
  }

  @Post('classes/:classId/deactivate')
  deactivateClass(@Req() req: AuthenticatedRequest, @Param('classId') classId: string) {
    return this.scheduleService.deactivateClass(this.requireUser(req), classId);
  }

  @Get('sessions')
  listSessions(@Req() req: AuthenticatedRequest, @Query() query: DateRangeQueryDto) {
    return this.scheduleService.listSessions(this.requireUser(req), query);
  }

  @Post('sessions')
  createSession(@Req() req: AuthenticatedRequest, @Body() body: CreateSessionDto) {
    return this.scheduleService.createSession(this.requireUser(req), body);
  }

  @Post('sessions/:sessionId/cancel')
  cancelSession(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.scheduleService.cancelSession(this.requireUser(req), sessionId);
  }

  @Get('sessions/:sessionId/roster')
  roster(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.scheduleService.roster(this.requireUser(req), sessionId);
  }

  @Post('sessions/:sessionId/check-in')
  checkIn(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string, @Body() body: CheckInDto) {
    return this.scheduleService.checkIn(this.requireUser(req), sessionId, body);
  }

  @Get('schedule')
  browse(@Req() req: AuthenticatedRequest, @Query() query: DateRangeQueryDto) {
    return this.scheduleService.browseSchedule(this.requireUser(req), query);
  }

  @Post('sessions/:sessionId/book')
  book(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.scheduleService.bookSession(this.requireUser(req), sessionId);
  }

  @Post('sessions/:sessionId/cancel-booking')
  cancelBooking(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.scheduleService.cancelMyBooking(this.requireUser(req), sessionId);
  }

  @Get('my-bookings')
  myBookings(@Req() req: AuthenticatedRequest, @Query() query: DateRangeQueryDto) {
    return this.scheduleService.myBookings(this.requireUser(req), query);
  }
}
