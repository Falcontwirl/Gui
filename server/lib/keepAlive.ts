// Vercel suspends a serverless function as soon as the request handler returns,
// killing any fire-and-forget promises. waitUntil tells the runtime to keep
// the function alive until the given promise settles (or maxDuration elapses).
// Locally, it's a no-op — our always-on Node server keeps promises alive
// naturally — so we silently fall back when not running on Vercel.
import { waitUntil } from '@vercel/functions';

export function keepAlive<T>(promise: Promise<T>): Promise<T> {
  try {
    waitUntil(promise);
  } catch {
    // Not running under Vercel's request context. Ignore.
  }
  return promise;
}
