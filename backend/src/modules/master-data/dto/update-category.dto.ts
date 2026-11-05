import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { CATEGORY_DESCRIPTION_MAX_LENGTH, CATEGORY_NAME_MAX_LENGTH, trim } from './create-category.dto.js';

const isProvided = (_: object, value: unknown) => value !== undefined;

export class UpdateCategoryDto {
  // name and isActive are non-nullable columns, so null must fail validation instead of being skipped.
  @ValidateIf(isProvided) @Transform(trim) @IsString() @MinLength(1) @MaxLength(CATEGORY_NAME_MAX_LENGTH) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(CATEGORY_DESCRIPTION_MAX_LENGTH) description?: string | null;
  @ValidateIf(isProvided) @IsBoolean() isActive?: boolean;
}
