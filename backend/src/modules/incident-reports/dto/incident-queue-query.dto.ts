import { IncidentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ReportQueryDto } from './report-query.dto.js';

export class IncidentQueueQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}
