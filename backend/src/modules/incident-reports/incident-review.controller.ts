import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AdminReportQueryDto } from './dto/admin-report-query.dto.js';
import { ReviewIncidentReportDto } from './dto/review-incident-report.dto.js';
import { IncidentReviewService } from './incident-review.service.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncidentReviewController {
  constructor(private readonly reviews: IncidentReviewService) {}
  @Get('pending') pending(@Query() query: AdminReportQueryDto) { return this.reviews.pending(query); }
  @Patch(':id/review') review(@CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewIncidentReportDto) {
    return this.reviews.review(adminId, id, dto);
  }
}
