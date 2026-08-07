import { Suspense } from "react";
import { ChatClient } from "./chat-client";

/**
 * /chat — server wrapper. The client logic reads `useSearchParams()`, so it
 * must mount inside a Suspense boundary for static prerendering (Next.js 15).
 */
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-container-lowest font-body text-sm text-on-surface-variant">
          Memuat percakapan...
        </div>
      }
    >
      <ChatClient />
    </Suspense>
  );
}