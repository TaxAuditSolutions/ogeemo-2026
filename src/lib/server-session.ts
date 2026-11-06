import { getFirebaseServices } from '@/firebase';

/**
 * Re-creates the server `session` cookie from the browser's current Firebase
 * sign-in. The cookie is normally set at page load, but that call can time out
 * (for example while the dev server compiles) or the cookie can expire while the
 * Firebase sign-in is still valid. Returns true when a fresh cookie was set.
 */
export async function refreshServerSession(): Promise<boolean> {
  try {
    const { auth } = getFirebaseServices();
    const user = auth.currentUser;
    if (!user) return false;
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** True for the server's "no or invalid session" errors, which a fresh cookie can fix. */
export function isSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Unauthorized: (No session cookie found|Invalid session cookie)/i.test(message);
}

/** fetch() for same-origin API routes; on a 401, refreshes the session cookie and retries once. */
export async function fetchWithSession(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;
  const refreshed = await refreshServerSession();
  if (!refreshed) return response;
  return fetch(input, init);
}

/** Runs a server action; on a missing/expired session, refreshes the cookie and retries once. */
export async function withServerSession<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isSessionError(error)) throw error;
    const refreshed = await refreshServerSession();
    if (!refreshed) {
      throw new Error('Your session has expired. Please sign out and sign in again, then retry.');
    }
    return action();
  }
}
