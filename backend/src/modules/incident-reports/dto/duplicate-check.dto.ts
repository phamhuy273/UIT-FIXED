import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import type { RelativeToRepair } from '../duplicates/duplicate-rules.js';

export class DuplicateCheckDto {
  @IsInt() @Min(1) locationId!: number;
  @IsInt() @Min(1) categoryId!: number;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(5) @MaxLength(160) title!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(10) @MaxLength(3000) description!: string;
  @IsOptional() @IsDateString() observedAt?: string;
}

export class ConfirmReportDto {
  @IsOptional() @IsIn(['BEFORE', 'AFTER']) relativeToRepair?: RelativeToRepair;
  @IsDateString() expectedUpdatedAt!: string;
  @IsOptional() @IsDateString() observedAt?: string;
}
