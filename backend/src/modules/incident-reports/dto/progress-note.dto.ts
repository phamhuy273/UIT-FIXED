import { IsString, MaxLength, MinLength } from 'class-validator';

export class ProgressNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  content!: string;
}
