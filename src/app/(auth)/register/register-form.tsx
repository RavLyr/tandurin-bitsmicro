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