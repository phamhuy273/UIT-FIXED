import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { IncidentReportsController } from './incident-reports.controller.js';
import { IncidentReportsService } from './incident-reports.service.js';
import { IncidentReviewController } from './incident-review.controller.js';
import { IncidentReviewService } from './incident-review.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentReportsController, IncidentReviewController],
  providers: [IncidentReportsService, IncidentReviewService],
})
export class IncidentReportsModule {}
