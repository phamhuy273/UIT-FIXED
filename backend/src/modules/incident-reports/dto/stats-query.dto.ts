import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export const STATS_RANGES = [7, 30, 90] as const;
export const STATS_SCOPES = ['active', 'approved'] as const;

export class StatsQueryDto {
  @IsOptional() @Type(() => Number) @IsIn(STATS_RANGES) days?: (typeof STATS_RANGES)[number];
  @IsOptional() @IsIn(STATS_SCOPES) scope: (typeof STATS_SCOPES)[number] = 'active';
}
