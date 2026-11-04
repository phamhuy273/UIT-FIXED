import { Role } from '@prisma/client';

export interface PublicUser {
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
  avatarUrl: string | null;
  departmentId: number | null;
  isActive: boolean;
  createdAt: Date;
}

export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
} as const;

export function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    departmentId: user.departmentId,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
