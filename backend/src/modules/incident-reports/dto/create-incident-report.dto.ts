import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { IncidentUrgency } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateIncidentReportDto {
  @IsInt() @Min(1) buildingId: number;
  @IsInt() @Min(1) locationId: number;
  @IsInt() @Min(1) categoryId: number;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(160) title: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(3000) description: string;
  @IsOptional() @IsEnum(IncidentUrgency) urgency?: IncidentUrgency;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) mediaIds?: number[];
}
