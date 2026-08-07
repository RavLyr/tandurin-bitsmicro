"use client";

import { dispatchToast, useToast, type ToastVariant } from "@/components/ui/toast";

/**
 * Imperative helper (shadcn-style import path): callable outside components.
 */
export function toast(message: string, variant?: ToastVariant) {
  dispatchToast(message, variant ?? "success");
}

export { useToast };
