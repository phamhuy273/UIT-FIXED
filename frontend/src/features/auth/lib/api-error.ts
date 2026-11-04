export function readErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const text = message.filter((item) => typeof item === 'string').join(' ');
      if (text) {
        return text;
      }
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === 401
  );
}
