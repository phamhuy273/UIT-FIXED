export type Role = 'STUDENT' | 'ADMIN' | 'TECH_STAFF';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
  avatarUrl: string | null;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterResult {
  message: string;
  user: AuthUser;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';
