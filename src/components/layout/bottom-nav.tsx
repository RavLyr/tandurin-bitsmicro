import Link from "next/link";
import type { ProtectedPathKey } from "@/components/layout/app-header";
import { STRINGS } from "@/lib/i18n";

const ITEMS: {
  key: ProtectedPathKey;
  label: string;
  ariaLabel: string;
  icon: string;
  href: string;
}[] = [
  { key: "dashboard", label: STRINGS.bottomNav.home, ariaLabel: STRINGS.bottomNav.homeAria, icon: "grid_view", href: "/dashboard" },
  { key: "chat", label: STRINGS.bottomNav.chat, ariaLabel: STRINGS.bottomNav.chatAria, icon: "chat_bubble", href: "/chat" },
  { key: "riwayat", label: STRINGS.bottomNav.riwayat, ariaLabel: STRINGS.bottomNav.riwayatAria, icon: "history", href: "/riwayat" },
  { key: "lahan", label: STRINGS.bottomNav.lahan, ariaLabel: STRINGS.bottomNav.lahanAria, icon: "landscape", href: "/lahan" },
];

/**
 * Mobile fixed bottom nav (DESIGN §3 / Stitch code(2)/(6)/(7)): HOME / CHAT / RIWAYAT / LAHAN.
 */
export function BottomNav({ activePath }: { activePath?: ProtectedPathKey }) {
  return (
    <footer className="fixed bottom-0 z-50 w-full border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-3 md:hidden">
      <nav className="flex items-center justify-around" aria-label={STRINGS.bottomNav.navAria}>
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.ariaLabel}
            aria-current={activePath === item.key ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded p-1 focus:outline-none focus:ring-2 focus:ring-primary ${
              activePath === item.key ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-semibold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </footer>
  );
}