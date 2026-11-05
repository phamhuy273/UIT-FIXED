import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ResolveIncidentDto {
  @IsString()
  @MinLength(5, { message: 'Ghi chú khắc phục sự cố tối thiểu 5 ký tự.' })
  @MaxLength(2000, { message: 'Ghi chú khắc phục sự cố tối đa 2000 ký tự.' })
  resolutionNote!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  mediaIds?: number[];
}
