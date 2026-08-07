import { Logo } from "@/components/layout/logo";
import { BottomNav } from "@/components/layout/bottom-nav";
import { STRINGS } from "@/lib/i18n";
import { ResetPasswordForm } from "./reset-form";

/**
 * /reset-password — set a new password after the recovery link (Supabase
 * recovery flow). The /auth/callback exchanges the code first; the session
 * here is the short-lived recovery session.
 */
export default function ResetPasswordPage() {
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
                  {STRINGS.auth.resetTitle}
                </h1>
                <p className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {STRINGS.brand.tagline}
                </p>
              </div>
            </div>

            <ResetPasswordForm />
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}