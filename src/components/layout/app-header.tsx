import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { STRINGS } from "@/lib/i18n";

export type ProtectedPathKey =
  | "dashboard"
  | "chat"
  | "riwayat"
  | "lahan"
  | "profil";

const NAV_LINKS: { key: ProtectedPathKey; label: string; href: string }[] = [
  { key: "riwayat", label: STRINGS.header.nav.riwayatAria, href: "/riwayat" },
  { key: "lahan", label: STRINGS.header.nav.lahanAria, href: "/lahan" },
];

/**
 * Sticky top header for protected pages (DESIGN §3 / Stitch code(2)/(5)/(6)/(7)).
 * Sticky top: fixed h-16, bg-surface-container-lowest, border-b outline-variant.
 */
export function AppHeader({ activePath }: { activePath?: ProtectedPathKey }) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-16 w-full items-center justify-between px-margin-mobile lg:px-margin-desktop">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label={STRINGS.header.homeAria}
            className="rounded focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Logo className="h-8 w-8 rounded-lg" />
          </Link>
          <div className="relative hidden md:block">
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-outline px-3 py-1.5 font-label text-sm uppercase transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>{STRINGS.header.landSwitcher}</span>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>
          </div>
        </div>
        <div className="flex flex-1 justify-center">
          <Link
            href="/chat"
            aria-label={STRINGS.header.chatCta}
            className="hidden rounded border-2 border-primary bg-primary px-6 py-2 text-sm font-bold uppercase text-on-primary transition-all duration-300 hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary md:block"
          >
            {STRINGS.header.chatCta}
          </Link>
        </div>
        <nav className="flex items-center gap-8" aria-label={STRINGS.header.navAria}>
          <div className="hidden items-center gap-8 text-sm font-semibold uppercase md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-label={link.label}
                aria-current={activePath === link.key ? "page" : undefined}
                className={
                  activePath === link.key
                    ? "text-on-surface underline decoration-2 underline-offset-8 focus:outline-none focus:ring-2 focus:ring-primary"
                    : "text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/profil"
            aria-label={STRINGS.header.profilAria}
            className={`flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary ${
              activePath === "profil" ? "ring-2 ring-primary" : ""
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-on-surface-variant ring-1 ring-outline ring-offset-2 ring-offset-surface-container-lowest">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                person
              </span>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}