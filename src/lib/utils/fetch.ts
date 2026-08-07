import { toast } from "@/components/ui/use-toast";
import { STRINGS } from "@/lib/i18n";

/**
 * Shared fetch wrapper: on non-OK response, surfaces the API `{ error }` body
 * as an Indonesian toast (client) or server console.error, then throws.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  if (res.ok) return res;

  let message: string = STRINGS.errors.defaultBody;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // non-JSON error body — keep the generic message
  }

  if (typeof window === "undefined") {
    console.error(`[apiFetch] ${res.status} ${String(input)}: ${message}`);
  } else {
    toast(message, "danger");
  }
  throw new Error(message);
}