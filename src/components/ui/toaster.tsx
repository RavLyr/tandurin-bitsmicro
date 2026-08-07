"use client";

import { ToastProvider, useToast } from "@/components/ui/toast";

/**
 * Root toaster for layout.tsx — must wrap the app tree (provides context).
 */
export function Toaster({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

export { useToast };
