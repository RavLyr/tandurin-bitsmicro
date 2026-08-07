"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Forgot-password form (Supabase resetPasswordForEmail): sends the reset link
 * to the given email. Always shows the neutral "check your inbox" message to
 * avoid leaking whether an account exists.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || sent) return;

    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast(STRINGS.auth.errorInvalidEmail, "danger");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, "");
      const redirectTo = `${base}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      toast(STRINGS.auth.errorNetwork, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">
          mail
        </span>
        <p className="font-body text-sm text-on-surface-variant">{STRINGS.auth.forgotSent}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full flex-col gap-4">
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.auth.forgotEmailLabel}
        </label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          placeholder={STRINGS.auth.forgotEmailPlaceholder}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? STRINGS.auth.submitting : STRINGS.auth.forgotSubmit}
      </Button>
    </form>
  );
}