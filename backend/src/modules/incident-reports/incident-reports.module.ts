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
import { DuplicateController } from './duplicates/duplicate.controller.js';
import { DuplicateService } from './duplicates/duplicate.service.js';
import { EmbeddingService } from './duplicates/embedding.service.js';
import { AdminDuplicateGroupsController } from './duplicates/admin-duplicate-groups.controller.js';
import { AdminDuplicateGroupsService } from './duplicates/admin-duplicate-groups.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    DuplicateController,
    AdminDuplicateGroupsController,
    IncidentReportsController,
    IncidentReviewController,
    IncidentStatsController,
    IncidentAssignmentController,
    StaffIncidentsController,
  ],
  providers: [
    DuplicateService, EmbeddingService,
    AdminDuplicateGroupsService,
    IncidentReportsService,
    IncidentReviewService,
    IncidentStatsService,
    IncidentAssignmentService,
    StaffIncidentsService,
  ],
  exports: [IncidentAssignmentService, StaffIncidentsService],
})
export class IncidentReportsModule {}
