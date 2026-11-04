import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from '../constants/auth.constants.js';

export function isAcceptablePassword(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return false;
  }
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
    return false;
  }
  return /\p{L}/u.test(value) && /\d/.test(value);
}
