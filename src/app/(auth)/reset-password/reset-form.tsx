"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Reset-password form (Supabase recovery flow): updates the password for the
 * currently active recovery session, then routes the user to /login.
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(STRINGS.auth.resetPasswordMin);
      return;
    }
    if (password !== confirm) {
      setError(STRINGS.auth.resetPasswordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast(STRINGS.auth.resetSuccess);
      router.push("/login");
    } catch {
      setError(STRINGS.auth.resetError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full flex-col gap-4">
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.auth.resetPasswordNew}
        </label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          placeholder={STRINGS.auth.passwordPlaceholder}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium text-on-surface">
          {STRINGS.auth.resetPasswordConfirm}
        </label>
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          placeholder={STRINGS.auth.passwordPlaceholder}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="font-body-md text-sm text-error">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? STRINGS.auth.submitting : STRINGS.auth.resetSubmit}
      </Button>
    </form>
  );
}