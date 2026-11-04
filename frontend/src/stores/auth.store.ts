import { create } from 'zustand';
import { getCurrentUser } from '@/features/auth/api/auth.api';
import { isUnauthorized } from '@/features/auth/lib/api-error';
import { clearAccessToken, readAccessToken, writeAccessToken } from '@/features/auth/lib/token-storage';
import { setUnauthorizedHandler } from '@/lib/axios';
import type { AuthUser, SessionStatus } from '@/features/auth/types/auth.types';

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  token: string | null;
  initialize: () => Promise<void>;
  retry: () => Promise<void>;
  establishSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
}

let boot: Promise<void> | null = null;
let generation = 0;

async function loadSession(set: (partial: Partial<AuthState>) => void) {
  const run = generation;
  const token = readAccessToken();
  if (!token) {
    if (generation === run) {
      set({ status: 'anonymous', user: null, token: null });
    }
    return;
  }

  set({ status: 'loading', token, user: null });
  try {
    const user = await getCurrentUser();
    if (generation !== run) {
      return;
    }
    set({ status: 'authenticated', user, token });
  } catch (error) {
    if (generation !== run) {
      return;
    }
    if (isUnauthorized(error)) {
      clearAccessToken();
      set({ status: 'anonymous', user: null, token: null });
      return;
    }
    set({ status: 'error', user: null, token });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  token: null,

  initialize: () => {
    boot ??= loadSession(set);
    return boot;
  },

  retry: () => {
    boot = null;
    generation += 1;
    return get().initialize();
  },

  establishSession: (token, user) => {
    generation += 1;
    writeAccessToken(token);
    set({ status: 'authenticated', token, user });
  },

  clearSession: () => {
    generation += 1;
    clearAccessToken();
    set({ status: 'anonymous', token: null, user: null });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().clearSession();
});
