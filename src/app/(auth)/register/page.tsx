import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";
import { RegisterForm } from "./register-form";

/**
 * /register — Daftar (F-01, DESIGN §4.1, Stitch screen-ui/code.html).
 * Server component shell; interactive form is a client component.
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 font-body text-text">
      <div className="w-full max-w-[420px] rounded-lg border border-outline-variant bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-16 w-16 rounded-lg" />
          <h1 className="mb-1 text-2xl font-bold">{STRINGS.brand.name}</h1>
          <p className="text-sm text-text-muted">{STRINGS.brand.tagline}</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-text-muted">
          {STRINGS.auth.haveAccount}{" "}
          <Link href="/login" className="rounded font-semibold text-primary hover:underline focus:ring-2 focus:ring-primary">
            {STRINGS.auth.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
