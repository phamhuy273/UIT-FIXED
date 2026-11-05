import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ConfirmReportDto, DuplicateCheckDto } from '../dto/duplicate-check.dto.js';
import { ReportQueryDto } from '../dto/report-query.dto.js';
import { DuplicateService } from './duplicate.service.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class DuplicateController {
  constructor(private readonly duplicates: DuplicateService) {}
  @Post('check-duplicates') check(@CurrentUser('id') id: number, @Body() dto: DuplicateCheckDto) {
    return this.duplicates.check(id, dto);
  }
  @Post(':id/confirmations') confirm(@CurrentUser('id') studentId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmReportDto) {
    return this.duplicates.confirm(studentId, id, dto);
  }
  @Get('my-confirmations') mine(@CurrentUser('id') id: number, @Query() query: ReportQueryDto) {
    return this.duplicates.mine(id, query);
  }
}
