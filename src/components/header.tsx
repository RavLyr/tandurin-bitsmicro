import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LandSwitcher } from "@/components/land-switcher";
import { STRINGS } from "@/lib/i18n";

export type ProtectedPathKey =
  | "dashboard"
  | "chat"
  | "riwayat"
  | "lahan"
  | "profil";

/**
 * Sticky top header for protected pages (DESIGN §3 nav model): logo + land
 * switcher (left), centered "Chat Tanduri" CTA (hidden on mobile), right nav
 * Riwayat/Lahan + profile avatar. Active route: underline.
 * ponytail: nav links duplicated from bottom-nav until a shared route registry
 * exists (T-304); upgrade path = single NAV registry module.
 */
export function Header({ activePath }: { activePath?: ProtectedPathKey }) {
  const isActive = (key: ProtectedPathKey) => activePath === key;

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
          <LandSwitcher />
        </div>

        <div className="flex flex-1 justify-center">
          <Link
            href="/chat"
            aria-label={STRINGS.header.chatCta}
            className="hidden rounded-md border-2 border-primary bg-primary px-6 py-2 font-button text-sm uppercase text-on-primary transition-all duration-300 hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary md:block"
          >
            {STRINGS.header.chatCta}
          </Link>
        </div>

        <nav className="flex items-center gap-6 md:gap-8" aria-label={STRINGS.header.navAria}>
          <div className="hidden items-center gap-8 text-sm font-semibold uppercase md:flex">
            {(["riwayat", "lahan"] as const).map((key) => (
              <Link
                key={key}
                href={`/${key}`}
                aria-label={STRINGS.header.nav[`${key}Aria` as "riwayatAria" | "lahanAria"]}
                aria-current={isActive(key) ? "page" : undefined}
                className={
                  isActive(key)
                    ? "text-on-surface underline decoration-2 underline-offset-8 focus:outline-none focus:ring-2 focus:ring-primary"
                    : "text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                }
              >
                {STRINGS.header.nav[`${key}Aria` as "riwayatAria" | "lahanAria"]}
              </Link>
            ))}
          </div>
          <Link
            href="/profil"
            aria-label={STRINGS.header.profilAria}
            className={`flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary ${
              isActive("profil") ? "ring-2 ring-primary" : ""
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
