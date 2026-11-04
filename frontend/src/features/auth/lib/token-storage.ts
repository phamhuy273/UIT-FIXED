const TOKEN_KEY = 'access_token:v1';
const LEGACY_TOKEN_KEY = 'access_token';

export function readAccessToken(): string | null {
  try {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current) {
      return current;
    }
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!legacy) {
      return null;
    }
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function writeAccessToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Private mode or a full quota leaves the session in memory only.
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore storage failures while clearing a session.
  }
}
