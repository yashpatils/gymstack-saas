import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../users/user.model';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('settings')
@VerifiedEmailRequired()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  updateSettings(@Req() req: { user?: { role?: UserRole } }, @Body() body: UpdateSettingsDto) {
    if (req.user?.role !== UserRole.Owner) {
      throw new ForbiddenException('Only owners can update settings');
    }

    return this.settingsService.updateSettings(body);
  }
}
