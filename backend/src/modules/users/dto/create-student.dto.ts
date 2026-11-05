import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../../auth/constants/auth.constants.js';
import { normalizeEmail } from '../../auth/utils/uit-student-email.js';
import { IsAcceptablePassword } from '../../auth/validators/is-acceptable-password.decorator.js';
import { IsUitStudentEmail } from '../../auth/validators/is-uit-student-email.decorator.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateStudentDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  @IsUitStudentEmail()
  email!: string;

  @IsString()
  @IsAcceptablePassword()
  password!: string;
}
