export function isRetryableRead(error: unknown): boolean {
  const value = error as { status?: number; response?: { status?: number }; name?: string };
  if (value?.name === 'AbortError') return false;
  const status = value?.status ?? value?.response?.status;
  return status == null || status === 408 || status === 429 || status >= 500;
}
