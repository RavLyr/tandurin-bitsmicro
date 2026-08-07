"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";
import { useToast } from "@/components/ui/toaster";

/**
 * Registration form (F-01, DESIGN §4.1): optional display name passed as
 * signup user metadata (profiles trigger reads `full_name`/email).
 * ponytail: error->message mapping duplicated with login-form; upgrade path =
 * shared src/app/(auth)/auth-errors.ts on the next auth consumer (T-102).
 */
export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(STRINGS.auth.signupConfirmEmail);
        toast(STRINGS.auth.signupConfirmEmail, "success");
      }
    } catch (err) {
      const mapped = mapSignupError(err);
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
      const message = err instanceof Error ? (err.message ?? "").toLowerCase() : "";
      const mapped = message.includes("network") || message.includes("fetch")
        ? STRINGS.auth.errorNetwork
        : STRINGS.auth.errorGoogleBlocked;
      setError(mapped);
      toast(mapped, "danger");
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-text" htmlFor="name">
          {STRINGS.auth.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          disabled={submitting}
          placeholder={STRINGS.auth.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-outline-variant px-3 py-2 text-text transition-shadow placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-text" htmlFor="email">
          {STRINGS.auth.emailLabelTitle}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={submitting}
          placeholder={STRINGS.auth.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-outline-variant px-3 py-2 text-text transition-shadow placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-text" htmlFor="password">
          {STRINGS.auth.passwordLabelTitle}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={submitting}
            minLength={6}
            placeholder={STRINGS.auth.passwordPlaceholderLong}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-outline-variant px-3 py-2 pr-10 text-text transition-shadow placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            aria-label={showPassword ? STRINGS.auth.hidePassword : STRINGS.auth.showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="font-body text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded-md bg-primary px-4 py-2.5 font-bold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? STRINGS.auth.submitting : STRINGS.auth.signUp}
      </button>
      <div
        className="my-2 flex items-center gap-3"
        role="separator"
        aria-label={STRINGS.auth.separator}
      >
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="text-sm text-text-muted">{STRINGS.auth.separator}</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>
      <GoogleButton disabled={submitting} onClick={handleGoogle} />
    </form>
  );
}

function mapSignupError(err: unknown): string {
  const message = err instanceof Error ? (err.message ?? "").toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch") || message.includes("load failed")) {
    return STRINGS.auth.errorNetwork;
  }
  if (message.includes("already registered") || message.includes("already been registered") || message.includes("duplicate")) {
    return STRINGS.auth.errorDuplicateEmail;
  }
  if (message.includes("already linked") || message.includes("identity") || message.includes("oauth")) {
    if (message.includes("exists") || message.includes("identity")) {
      return STRINGS.auth.errorIdentityConflict;
    }
  }
  if (message.includes("invalid email") || message.includes("email_address_invalid")) {
    return STRINGS.auth.errorInvalidEmail;
  }
  return STRINGS.auth.errorInvalidEmail;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GoogleButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface px-4 py-2.5 font-semibold text-text transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      <GoogleIcon />
      {STRINGS.auth.google}
    </button>
  );
}