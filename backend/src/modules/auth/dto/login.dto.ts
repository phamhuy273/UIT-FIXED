import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../constants/auth.constants.js';
import { normalizeEmail } from '../utils/uit-student-email.js';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
