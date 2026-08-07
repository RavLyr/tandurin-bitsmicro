"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";

/**
 * Email/Google sign-in form (F-01, DESIGN §4.1).
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
      const mapped = mapAuthError(err, "login");
      setError(mapped);
      if (mapped !== STRINGS.auth.errorNetwork) toast(mapped, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      const mapped = mapAuthError(err, "google");
      setError(mapped);
      toast(mapped, "danger");
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
          <a
            href="#"
            className="font-label-sm rounded px-1 text-[10px] uppercase tracking-wider text-on-surface-variant underline decoration-1 underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STRINGS.auth.forgotPassword}
          </a>
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

        <div className="flex items-center gap-4 py-2" role="separator" aria-label={STRINGS.auth.separator}>
          <div className="h-px flex-1 bg-outline-variant" />
          <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
            {STRINGS.auth.separator}
          </span>
          <div className="h-px flex-1 bg-outline-variant" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-outline-variant bg-surface py-3 text-text font-button transition-colors duration-300 hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleIcon />
          <span>{STRINGS.auth.google}</span>
        </button>
      </div>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** Map Supabase auth errors → exact Indonesian strings (F-01 §7). */
function mapAuthError(err: unknown, mode: "login" | "google"): string {
  const message = err instanceof Error ? (err.message ?? "").toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch") || message.includes("load failed")) {
    return STRINGS.auth.errorNetwork;
  }

  if (mode === "google") {
    return STRINGS.auth.errorGoogleBlocked;
  }

  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return STRINGS.auth.errorWrongPassword;
  }
  if (message.includes("email not confirmed")) {
    return STRINGS.auth.errorWrongPassword;
  }
  return STRINGS.auth.errorWrongPassword;
}