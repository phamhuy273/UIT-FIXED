import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../constants/auth.constants.js';
import { normalizeEmail } from '../utils/uit-student-email.js';
import { IsAcceptablePassword } from '../validators/is-acceptable-password.decorator.js';
import { IsUitStudentEmail } from '../validators/is-uit-student-email.decorator.js';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
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
