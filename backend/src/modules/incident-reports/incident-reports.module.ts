import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { IncidentAssignmentController } from './incident-assignment.controller.js';
import { IncidentAssignmentService } from './incident-assignment.service.js';
import { IncidentReportsController } from './incident-reports.controller.js';
import { IncidentReportsService } from './incident-reports.service.js';
import { IncidentReviewController } from './incident-review.controller.js';
import { IncidentReviewService } from './incident-review.service.js';
import { IncidentStatsController } from './incident-stats.controller.js';
import { IncidentStatsService } from './incident-stats.service.js';
import { StaffIncidentsController } from './staff-incidents.controller.js';
import { StaffIncidentsService } from './staff-incidents.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    IncidentReportsController,
    IncidentReviewController,
    IncidentStatsController,
    IncidentAssignmentController,
    StaffIncidentsController,
  ],
  providers: [
    IncidentReportsService,
    IncidentReviewService,
    IncidentStatsService,
    IncidentAssignmentService,
    StaffIncidentsService,
  ],
  exports: [IncidentAssignmentService, StaffIncidentsService],
})
export class IncidentReportsModule {}
