import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AssignIncidentDto } from './dto/assign-incident.dto.js';
import { IncidentQueueQueryDto } from './dto/incident-queue-query.dto.js';
import { IncidentAssignmentService } from './incident-assignment.service.js';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncidentAssignmentController {
  constructor(private readonly assignmentService: IncidentAssignmentService) {}

  @Get('queue')
  getQueue(@Query() query: IncidentQueueQueryDto) {
    return this.assignmentService.getIncidentsQueue(query);
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
