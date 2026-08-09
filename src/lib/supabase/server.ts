import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request cookies.
 * Use in server components and route handlers. Next 15: cookies() is async.
 *
 * Includes refresh-retry: when getUser() fails with "Invalid Refresh Token"
 * (token-rotation race from parallel API calls), it creates a fresh client that
 * reads the now-rotated cookies and retries once.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );

  // Wrap getUser with retry-on-refresh-race behavior.
  const origGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async () => {
    try {
      return await origGetUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const isRefreshRace =
        message.includes("Invalid Refresh Token") ||
        message.includes("Refresh Token Not Found");
      if (!isRefreshRace) throw err;

      // A parallel request won the rotation — spin a fresh client that reads
      // the rotated cookies and retry once.
      const cookieStore2 = await cookies();
      const retryClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore2.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore2.set(name, value, options),
                );
              } catch {
                // Server Component — safe to ignore.
              }
            },
          },
        },
      );
      return retryClient.auth.getUser();
    }
  };

  return client;
}
