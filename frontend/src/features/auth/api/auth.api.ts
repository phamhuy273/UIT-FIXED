import { apiClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.type';
import { normalizeEmail } from '../lib/auth-rules';
import type { AuthUser, LoginResult, RegisterResult } from '../types/auth.types';

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const body = await apiClient.post<unknown, ApiResponse<LoginResult>>('/auth/login', {
    email: normalizeEmail(email),
    password,
  });
  return body.data;
}

export async function registerRequest(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  const body = await apiClient.post<unknown, ApiResponse<RegisterResult>>('/auth/register', {
    fullName: input.fullName.trim(),
    email: normalizeEmail(input.email),
    password: input.password,
  });
  return body.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const body = await apiClient.get<unknown, ApiResponse<AuthUser>>('/users/me');
  return body.data;
}
