import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from './create-category.dto.js';

export const DEPARTMENT_NAME_MAX_LENGTH = 100;
export const DEPARTMENT_DESCRIPTION_MAX_LENGTH = 500;

export class CreateDepartmentDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(DEPARTMENT_NAME_MAX_LENGTH) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(DEPARTMENT_DESCRIPTION_MAX_LENGTH) description?: string | null;
}
