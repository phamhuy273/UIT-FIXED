import type { Role } from '../types/auth.types';

export const UIT_STUDENT_EMAIL_DOMAIN = 'gm.uit.edu.vn';

export const UIT_STUDENT_EMAIL_MESSAGE =
  'Vui lòng sử dụng email sinh viên UIT có đuôi @gm.uit.edu.vn.';

export const INVALID_EMAIL_MESSAGE = 'Email không đúng định dạng.';

export const PASSWORD_POLICY_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số, và không dài quá 72 byte.';

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) {
    return 'Nhập email sinh viên.';
  }
  const atIndex = email.indexOf('@');
  const shaped =
    atIndex > 0 && atIndex === email.lastIndexOf('@') && atIndex < email.length - 1 && !/\s/.test(email);
  if (!shaped) {
    return INVALID_EMAIL_MESSAGE;
  }
  if (email.slice(atIndex + 1) !== UIT_STUDENT_EMAIL_DOMAIN) {
    return UIT_STUDENT_EMAIL_MESSAGE;
  }
  return null;
}

export function passwordError(value: string): string | null {
  const bytes = new TextEncoder().encode(value).length;
  if (value.length < 8 || bytes > 72 || !/\p{L}/u.test(value) || !/\d/.test(value)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}

export function fullNameError(value: string): string | null {
  const name = value.trim();
  if (name.length < 2 || name.length > 100) {
    return 'Họ và tên cần từ 2 đến 100 ký tự.';
  }
  return null;
}

export function roleHome(role: Role): string {
  if (role === 'ADMIN') {
    return '/admin';
  }
  if (role === 'TECH_STAFF') {
    return '/staff';
  }
  return '/';
}

export function roleLabel(role: Role): string {
  if (role === 'ADMIN') {
    return 'Quản trị';
  }
  if (role === 'TECH_STAFF') {
    return 'Kỹ thuật';
  }
  return 'Sinh viên';
}
