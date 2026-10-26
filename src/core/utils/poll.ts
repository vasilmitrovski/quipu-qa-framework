/**
 * Retry an async read until the predicate passes. Useful when a write made through one
 * layer (e.g. the UI) becomes visible through another (e.g. the API) slightly later.
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 10_000, intervalMs = 500 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T = await read();
  while (!predicate(last)) {
    if (Date.now() > deadline) {
      throw new Error(`pollUntil timed out after ${timeoutMs}ms. Last value: ${JSON.stringify(last)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await read();
  }
  return last;
}
