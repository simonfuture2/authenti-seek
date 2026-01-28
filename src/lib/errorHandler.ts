/**
 * Centralized error handling utility for production-safe error logging.
 * Logs detailed errors only in development, sanitizes in production.
 */

const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Logs an error with context. In production, only logs generic messages.
 * @param error - The error object
 * @param context - A description of where the error occurred
 */
export function logError(error: unknown, context: string): void {
  if (isDevelopment) {
    console.error(`[${context}]`, error);
  }
  // In production, errors could be sent to an error tracking service like Sentry
  // For now, we suppress console output to avoid information leakage
}

/**
 * Returns a user-safe error message based on the error type.
 * Never exposes internal details to users.
 * @param error - The error object
 * @param defaultMessage - A generic message to show users
 * @returns A safe error message string
 */
export function getSafeErrorMessage(
  error: unknown, 
  defaultMessage: string = "An error occurred. Please try again."
): string {
  // Never expose internal error details to users
  // The default message is always returned in production
  if (isDevelopment && error instanceof Error) {
    // In development, we can show more details for debugging
    return error.message;
  }
  return defaultMessage;
}

/**
 * Wraps an async function with error handling
 * @param fn - The async function to wrap
 * @param context - Context for error logging
 * @param onError - Optional callback for error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  onError?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    onError?.(error);
    return null;
  }
}
