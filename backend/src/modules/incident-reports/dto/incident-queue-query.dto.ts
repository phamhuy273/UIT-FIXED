import { IncidentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { AdminReportQueryDto } from './admin-report-query.dto.js';

export class IncidentQueueQueryDto extends AdminReportQueryDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}
