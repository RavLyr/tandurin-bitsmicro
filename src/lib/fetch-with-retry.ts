"use client";

/**
 * Fetch wrapper with auth-retry for the token-rotation race condition.
 *
 * When the page loads, the middleware refreshes the access token and sets new
 * cookies in its response. But the browser may not have processed those
 * Set-Cookie headers by the time the page's parallel data fetches fire — so
 * the first wave of API calls can arrive with a stale refresh token. Only one
 * of those calls wins the token rotation; the rest fail with 500 "Invalid
 * Refresh Token".
 *
 * This wrapper detects that specific failure, waits briefly for the browser to
 * settle the new cookies, then retries once. The retry sends the now-fresh
 * cookies and succeeds.
 */

const REFRESH_ERROR_PATTERNS = [
  "invalid refresh token",
  "refresh token not found",
];

async function readErrorBody(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error ?? "";
  } catch {
    return "";
  }
}

function isRefreshRaceError(response: Response, body: string): boolean {
  if (response.status !== 500 && response.status !== 401) return false;
  const lower = body.toLowerCase();
  return REFRESH_ERROR_PATTERNS.some((p) => lower.includes(p));
}

const RETRY_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithAuthRetry(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const body = await readErrorBody(response);
    if (isRefreshRaceError(response, body)) {
      // Browser is still settling the rotated cookies — wait briefly and retry.
      await delay(RETRY_DELAY_MS);
      return fetch(input, init);
    }
  }

  return response;
}
