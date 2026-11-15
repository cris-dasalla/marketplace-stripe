/**
 * Calls `fetch` until `isDone(result)` or attempts run out, waiting `delayMs`
 * between tries. Returns the last result either way.
 *
 * Used on the success page: Stripe redirects the buyer as soon as the card is
 * charged, but the Checkout Session flips to payment_status "paid" a moment later.
 */
export async function retryUntil<T>(
  fetch: () => Promise<T>,
  isDone: (value: T) => boolean,
  { attempts = 8, delayMs = 1250, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)) } = {},
): Promise<T> {
  let value = await fetch();
  for (let i = 1; i < attempts && !isDone(value); i++) {
    await sleep(delayMs);
    value = await fetch();
  }
  return value;
}
