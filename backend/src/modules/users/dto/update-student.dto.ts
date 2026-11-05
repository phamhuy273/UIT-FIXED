import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../../auth/constants/auth.constants.js';
import { normalizeEmail } from '../../auth/utils/uit-student-email.js';
import { IsAcceptablePassword } from '../../auth/validators/is-acceptable-password.decorator.js';
import { IsUitStudentEmail } from '../../auth/validators/is-uit-student-email.decorator.js';

const isProvided = (_: object, value: unknown) => value !== undefined;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateStudentDto {
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ValidateIf(isProvided)
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  @IsUitStudentEmail()
  email?: string;

  @ValidateIf(isProvided)
  @IsBoolean()
  isActive?: boolean;

  @ValidateIf(isProvided)
  @IsString()
  @IsAcceptablePassword()
  password?: string;
}
