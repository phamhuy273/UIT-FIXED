import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../../auth/constants/auth.constants.js';
import { normalizeEmail } from '../../auth/utils/uit-student-email.js';
import { IsAcceptablePassword } from '../../auth/validators/is-acceptable-password.decorator.js';
import { IsUitStudentEmail } from '../../auth/validators/is-uit-student-email.decorator.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const STAFF_EMAIL_MESSAGE = 'Vui lòng sử dụng email có đuôi @gm.uit.edu.vn.';

export class CreateStaffDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  @IsUitStudentEmail({ message: STAFF_EMAIL_MESSAGE })
  email!: string;

  @IsString()
  @IsAcceptablePassword()
  password!: string;

  @IsInt()
  @Min(1)
  departmentId!: number;
}
