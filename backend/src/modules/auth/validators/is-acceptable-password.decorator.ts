import { registerDecorator, ValidationOptions } from 'class-validator';
import { PASSWORD_POLICY_MESSAGE } from '../constants/auth.constants.js';
import { isAcceptablePassword } from '../utils/password-policy.js';

export function IsAcceptablePassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAcceptablePassword',
      target: object.constructor,
      propertyName,
      options: { message: PASSWORD_POLICY_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown) {
          return isAcceptablePassword(value);
        },
      },
    });
  };
}
