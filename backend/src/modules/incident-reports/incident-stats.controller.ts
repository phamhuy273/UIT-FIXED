import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { IncidentStatsService } from './incident-stats.service.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncidentStatsController {
  constructor(private readonly stats: IncidentStatsService) {}
  @Get('stats') summary(@Query() query: StatsQueryDto) { return this.stats.summary(query); }
}
