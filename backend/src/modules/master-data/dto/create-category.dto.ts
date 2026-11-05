import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const CATEGORY_NAME_MAX_LENGTH = 100;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

export const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(CATEGORY_NAME_MAX_LENGTH) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(CATEGORY_DESCRIPTION_MAX_LENGTH) description?: string | null;
}
