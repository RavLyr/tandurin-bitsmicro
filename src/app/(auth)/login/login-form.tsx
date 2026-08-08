"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";

/**
 * Email sign-in form (F-01, DESIGN §4.1).
 * Maps auth errors to exact Indonesian strings (F-01 §7, T-101 step 3).
 * ponytail: error->message mapping duplicated in register-form; upgrade path =
 * shared auth-errors util when a third auth consumer appears (T-102).
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next");

  const goDashboard = () => {
    router.push(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      goDashboard();
    } catch (err) {
      const mapped = mapAuthError(err);
      setError(mapped);
      if (mapped !== STRINGS.auth.errorNetwork) toast(mapped, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="z-10 flex w-full flex-col gap-6" onSubmit={handleEmailSubmit}>
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <label
            htmlFor="email"
            className="font-label-sm absolute -top-5 left-0 text-[10px] uppercase tracking-widest text-on-surface-variant"
          >
            {STRINGS.auth.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            required
            disabled={submitting}
            placeholder={STRINGS.auth.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border-b border-outline-variant bg-transparent py-2 font-body-md text-text transition-colors focus:border-primary focus:ring-0 focus:outline-none placeholder:text-outline"
          />
        </div>

        <div className="relative mt-4 w-full">
          <label
            htmlFor="password"
            className="font-label-sm absolute -top-5 left-0 text-[10px] uppercase tracking-widest text-on-surface-variant"
          >
            {STRINGS.auth.passwordLabel}
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              disabled={submitting}
              placeholder={STRINGS.auth.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border-b border-outline-variant bg-transparent py-2 pr-10 font-body-md text-text transition-colors focus:border-primary focus:ring-0 focus:outline-none placeholder:text-outline"
            />
            <button
              type="button"
              aria-label={showPassword ? STRINGS.auth.hidePassword : STRINGS.auth.showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-0 rounded p-2 text-on-surface-variant transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex w-full justify-end">
          <Link
            href="/lupa-sandi"
            className="font-label-sm rounded px-1 text-[10px] uppercase tracking-wider text-on-surface-variant underline decoration-1 underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STRINGS.auth.forgotPassword}
          </Link>
        </div>

        {error ? (
          <p role="alert" className="font-body-md text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="group relative w-full overflow-hidden rounded-md bg-primary py-3 font-button uppercase text-on-primary transition-colors duration-300 hover:bg-primary-fixed-dim focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="relative z-10">
            {submitting ? STRINGS.auth.submitting : STRINGS.auth.signIn}
          </span>
        </button>
      </div>
    </form>
  );
}

/** Map Supabase auth errors → exact Indonesian strings (F-01 §7). */
function mapAuthError(err: unknown): string {
  const message = err instanceof Error ? (err.message ?? "").toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch") || message.includes("load failed")) {
    return STRINGS.auth.errorNetwork;
  }

  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return STRINGS.auth.errorWrongPassword;
  }
  if (message.includes("email not confirmed")) {
    return STRINGS.auth.errorWrongPassword;
  }
  return STRINGS.auth.errorWrongPassword;
}