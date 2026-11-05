import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import type { RelativeToRepair } from '../duplicates/duplicate-rules.js';
import { IncidentUrgency } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateIncidentReportDto {
  @IsInt() @Min(1) buildingId: number;
  @IsInt() @Min(1) locationId: number;
  @IsInt() @Min(1) categoryId: number;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(160) title: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(3000) description: string;
  @IsOptional() @IsEnum(IncidentUrgency) urgency?: IncidentUrgency;
  @IsOptional() @IsDateString() observedAt?: string;
  @IsOptional() @IsIn(['BEFORE', 'AFTER']) relativeToRepair?: RelativeToRepair;
  @IsOptional() @IsInt() @Min(1) recurrenceOfIncidentId?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) mediaIds?: number[];
}
