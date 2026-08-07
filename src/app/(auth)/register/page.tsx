"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";

/**
 * /register — Sign up (Stitch screen-ui/code.html, name-field variant; code(1).html is identical).
 * Client component: password visibility toggle + prototype submit state.
 * No auth wiring yet (T-003/T-101).
 * ponytail: inline Tailwind instead of shared primitives; extraction to src/components/ui/* lands in
 * T-005, form submission via supabase/auth in T-101.
 */
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 font-body text-text">
      <div className="w-full max-w-[420px] rounded-lg border border-outline-variant bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-16 w-16 rounded-lg" />
          <h1 className="mb-1 text-2xl font-bold">{STRINGS.brand.name}</h1>
          <p className="text-sm text-text-muted">{STRINGS.brand.tagline}</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text" htmlFor="name">
              {STRINGS.auth.nameLabel}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder={STRINGS.auth.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-outline-variant px-3 py-2 text-text transition-shadow placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
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

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-primary px-4 py-2.5 font-bold text-white transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {STRINGS.auth.signUp}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3" role="separator" aria-label={STRINGS.auth.separator}>
          <div className="h-px flex-1 bg-outline-variant" />
          <span className="text-sm text-text-muted">{STRINGS.auth.separator}</span>
          <div className="h-px flex-1 bg-outline-variant" />
        </div>

        <button
          type="button"
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface px-4 py-2.5 font-semibold text-text transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
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
          {STRINGS.auth.google}
        </button>

        <p className="text-center text-sm text-text-muted">
          {STRINGS.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline focus:ring-2 focus:ring-primary rounded">
            {STRINGS.auth.login}
          </Link>
        </p>
      </div>
    </main>
  );
}