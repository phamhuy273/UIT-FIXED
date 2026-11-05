import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { AdminReportQueryDto } from '../dto/admin-report-query.dto.js';
import { AdminDuplicateGroupsService } from './admin-duplicate-groups.service.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDuplicateGroupsController {
  constructor(private readonly groups: AdminDuplicateGroupsService) {}
  @Get('pending-groups') pending(@Query() query: AdminReportQueryDto) { return this.groups.pending(query); }
}
