import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ReportQueryDto } from './report-query.dto.js';

export class AdminReportQueryDto extends ReportQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) floorId?: number;
}
