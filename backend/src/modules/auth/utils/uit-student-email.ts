import { UIT_STUDENT_EMAIL_DOMAIN } from '../constants/auth.constants.js';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hasSingleAtEmailShape(value: string): boolean {
  const email = normalizeEmail(value);
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) {
    return false;
  }
  return !/\s/.test(email);
}

export function isUitStudentEmail(value: string): boolean {
  if (!hasSingleAtEmailShape(value)) {
    return false;
  }
  const email = normalizeEmail(value);
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return domain === UIT_STUDENT_EMAIL_DOMAIN;
}
