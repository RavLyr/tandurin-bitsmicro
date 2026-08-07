import Link from "next/link";
import { STRINGS } from "@/lib/i18n";

/** Global 404 page: styled, Indonesian, links back to the dashboard. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-margin-mobile">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">
          pin_drop
        </span>
        <p className="mt-4 font-label text-4xl font-bold text-on-surface-variant">404</p>
        <h1 className="mt-2 font-headline text-xl font-semibold text-on-surface">
          {STRINGS.errors.notFoundTitle}
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          {STRINGS.errors.notFoundBody}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 block w-full rounded-md bg-primary px-4 py-2.5 font-button text-on-primary transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STRINGS.errors.backHome}
        </Link>
      </div>
    </div>
  );
}