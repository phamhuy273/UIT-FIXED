import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AssignIncidentDto {
  @IsInt()
  @Min(1)
  departmentId!: number;

  @IsInt()
  @Min(1)
  assigneeId!: number;

  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
