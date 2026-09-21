export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function isTotpEnrollmentError(message: string) {
  return message.toLowerCase().includes('totp enrollment');
}
