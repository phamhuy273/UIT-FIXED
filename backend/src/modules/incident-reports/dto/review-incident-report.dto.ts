import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { IncidentUrgency } from '@prisma/client';

export class ReviewIncidentReportDto {
  @IsIn(['APPROVE', 'REJECT']) action: 'APPROVE' | 'REJECT';
  @IsOptional() @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @IsEnum(IncidentUrgency) urgency?: IncidentUrgency;
  @ValidateIf((dto: ReviewIncidentReportDto) => dto.action === 'REJECT' || dto.reason !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(1000) reason?: string;
}
