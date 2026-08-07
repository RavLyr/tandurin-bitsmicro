import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";
import { ForgotPasswordForm } from "./forgot-form";

/**
 * /lupa-sandi — forgot password (Supabase resetPasswordForEmail).
 * Server component shell; the form triggers the reset email client-side.
 */
export default function LupaSandPage() {
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
                  {STRINGS.auth.forgotTitle}
                </h1>
                <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {STRINGS.brand.tagline}
                </p>
              </div>
            </div>

            <ForgotPasswordForm />

            <div className="z-10 mt-4 text-center">
              <Link
                href="/login"
                className="font-body rounded px-1 text-sm text-on-surface-variant underline decoration-1 underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {STRINGS.auth.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}