// supabase/functions/invite-agent/retry.ts

/**
 * Retries a function that returns a promise, with exponential backoff.
 * @param fn The function to retry.
 * @param attempts The maximum number of attempts.
 * @param delay The initial delay in milliseconds.
 * @returns A promise that resolves with the result of the function.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
      }
    }
  }
  throw lastError;
}
