import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IncidentStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AssignIncidentDto } from './dto/assign-incident.dto.js';
import { IncidentAssignmentService } from './incident-assignment.service.js';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncidentAssignmentController {
  constructor(private readonly assignmentService: IncidentAssignmentService) {}

  @Get('queue')
  getQueue(
    @Query('status') status?: IncidentStatus,
    @Query('buildingId') buildingId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentService.getIncidentsQueue({
      status,
      buildingId: buildingId ? parseInt(buildingId, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Post(':id/assign')
  assign(
    @CurrentUser('id') adminId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIncidentDto,
  ) {
    return this.assignmentService.assign(adminId, id, dto);
  }
}
