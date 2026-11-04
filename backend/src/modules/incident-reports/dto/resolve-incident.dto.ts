import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveIncidentDto {
  @IsString()
  @MinLength(5, { message: 'Ghi chú khắc phục sự cố tối thiểu 5 ký tự.' })
  @MaxLength(2000, { message: 'Ghi chú khắc phục sự cố tối đa 2000 ký tự.' })
  resolutionNote!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  mediaIds?: number[];
}
