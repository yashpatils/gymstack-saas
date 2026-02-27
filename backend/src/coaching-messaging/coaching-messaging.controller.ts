import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req } from '@nestjs/common';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { CoachingMessagingService } from './coaching-messaging.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

type AuthenticatedRequest = {
  user?: {
    id: string;
    email?: string;
    orgId?: string;
    activeTenantId?: string;
    activeGymId?: string;
    supportMode?: {
      tenantId: string;
      locationId?: string;
    };
  };
};

@Controller('coaching')
@VerifiedEmailRequired()
export class CoachingMessagingController {
  constructor(private readonly coachingMessagingService: CoachingMessagingService) {}

  @Get('assignments')
  listAssignments(@Req() req: AuthenticatedRequest) {
    return this.coachingMessagingService.listAssignments(this.requireUser(req));
  }

  @Post('assignments')
  createAssignment(@Req() req: AuthenticatedRequest, @Body() body: CreateAssignmentDto) {
    return this.coachingMessagingService.createAssignment(this.requireUser(req), body);
  }

  @Delete('assignments/:id')
  deleteAssignment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.coachingMessagingService.deleteAssignment(this.requireUser(req), id);
  }

  @Get('assignments/:id/messages')
  listMessages(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Query() query: ListMessagesDto) {
    return this.coachingMessagingService.listMessages(this.requireUser(req), id, query);
  }

  @Post('assignments/:id/messages')
  sendMessage(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: SendMessageDto) {
    return this.coachingMessagingService.sendMessage(this.requireUser(req), id, body);
  }

  @Post('assignments/:id/read')
  markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.coachingMessagingService.markRead(this.requireUser(req), id);
  }

  private requireUser(req: AuthenticatedRequest): NonNullable<AuthenticatedRequest['user']> {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }

    return req.user;
  }
}
