import { registerDecorator, ValidationOptions } from 'class-validator';
import { UIT_STUDENT_EMAIL_MESSAGE } from '../constants/auth.constants.js';
import { hasSingleAtEmailShape, isUitStudentEmail } from '../utils/uit-student-email.js';

export function IsUitStudentEmail(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isUitStudentEmail',
      target: object.constructor,
      propertyName,
      options: { message: UIT_STUDENT_EMAIL_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !hasSingleAtEmailShape(value)) {
            return true;
          }
          return isUitStudentEmail(value);
        },
      },
    });
  };
}
