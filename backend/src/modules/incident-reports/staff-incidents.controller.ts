import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ProgressNoteDto } from './dto/progress-note.dto.js';
import { ResolveIncidentDto } from './dto/resolve-incident.dto.js';
import { StaffIncidentQueryDto } from './dto/staff-incident-query.dto.js';
import { StaffIncidentsService } from './staff-incidents.service.js';

@Controller('staff/incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECH_STAFF)
export class StaffIncidentsController {
  constructor(private readonly staffService: StaffIncidentsService) {}

  @Get()
  getMyTasks(
    @CurrentUser('id') staffId: number,
    @Query() query: StaffIncidentQueryDto,
  ) {
    return this.staffService.getMyTasks(staffId, query);
  }

  @Get(':id')
  getTaskDetail(
    @CurrentUser('id') staffId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.staffService.getTaskDetail(staffId, id);
  }

  @Patch(':id/accept')
  acceptTask(
    @CurrentUser('id') staffId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.staffService.acceptTask(staffId, id);
  }

  @Post(':id/progress')
  addProgressNote(
    @CurrentUser('id') staffId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProgressNoteDto,
  ) {
    return this.staffService.addProgressNote(staffId, id, dto.content);
  }

  @Patch(':id/resolve')
  resolveTask(
    @CurrentUser('id') staffId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.staffService.resolveTask(staffId, id, dto);
  }
}
