import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto.js';
import { CancelReportDto } from './dto/cancel-report.dto.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { IncidentReportsService } from './incident-reports.service.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class IncidentReportsController {
  constructor(private readonly reports: IncidentReportsService) {}
  @Post() create(@CurrentUser('id') studentId: number, @Body() dto: CreateIncidentReportDto) { return this.reports.create(studentId, dto); }
  @Get('my') mine(@CurrentUser('id') studentId: number, @Query() query: ReportQueryDto) { return this.reports.myReports(studentId, query); }
  @Delete(':id') cancel(@CurrentUser('id') studentId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: CancelReportDto) {
    return this.reports.cancel(studentId, id, dto.reason);
  }
}
