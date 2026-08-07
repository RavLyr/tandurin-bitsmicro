import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";
import { LoginForm } from "./login-form";

/**
 * /login — Masuk (F-01, DESIGN §4.1, Stitch screen-ui/code(3).html).
 * Server component shell; interactive form is a client component
 * (login-form.tsx) because it reads useSearchParams for the `next` param.
 */
export default function LoginPage() {
  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface" />
      <main className="w-full pt-16">
        <div className="flex h-full min-h-[calc(100vh-64px)] w-full flex-col items-center justify-center py-margin-mobile md:py-margin-desktop">
          <div className="relative z-10 flex w-full max-w-[420px] flex-col gap-8 rounded-lg bg-surface p-8 shadow-sm">
            <div className="z-10 flex flex-col items-center gap-4 text-center">
              <Logo className="h-20 w-20 rounded-2xl" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display-lg-mobile text-text tracking-tight md:font-display-lg">
                  {STRINGS.brand.name}
                </h1>
                <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {STRINGS.brand.tagline}
                </p>
              </div>
            </div>

            <Suspense>
              <LoginForm />
            </Suspense>

            <div className="z-10 mt-4 text-center">
              <p className="font-body text-sm text-on-surface-variant">
                {STRINGS.auth.noAccount}{" "}
                <Link
                  href="/register"
                  className="rounded px-1 font-bold text-primary hover:underline decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STRINGS.auth.signUp}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
