import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/user.model';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
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
