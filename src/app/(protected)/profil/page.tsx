"use client";

import { useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { STRINGS } from "@/lib/i18n";

/**
 * /profil — Profile settings (Stitch screen-ui/code(4).html).
 * Prototype port: Data Diri + Preferensi Pengingat + Keamanan Akun with empty form values;
 * PATCH /api/profil wiring lands in T-404.
 * ponytail: inline Tailwind + static sections; upgrade path = shared primitives (T-005),
 * avatar upload + PATCH profile via supabase (T-404).
 */
const REMINDER_HOURS = STRINGS.profil.reminderOptions;

function SectionTitle({ number, label }: { number: string; label: string }) {
  return (
    <h2 className="mb-6 flex items-center gap-4 text-xs font-label uppercase tracking-widest text-outline">
      <span className="h-[1px] w-8 bg-outline" />
      {number}. {label}
    </h2>
  );
}

export default function ProfilPage() {
  const [displayName, setDisplayName] = useState("");
  const [email] = useState("");
  const [reminderHour, setReminderHour] = useState("07:00");
  const [emailReminder, setEmailReminder] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <AppHeader activePath="profil" />
      <main className="w-full pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-on-surface lg:text-5xl">
              {STRINGS.profil.heading}
              <br />
              {STRINGS.profil.headingLine}
            </h1>
            <p className="mt-4 max-w-lg font-body text-base text-on-surface-variant">
              {STRINGS.profil.subtitle}
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="flex flex-col gap-12 lg:col-span-8">
              {/* Section 1: Data Diri */}
              <section>
                <SectionTitle number="01" label={STRINGS.profil.sectionDataTitle} />
                <div className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-8 transition-all duration-300 hover:shadow-sm lg:p-12">
                  <form onSubmit={(event) => event.preventDefault()}>
                    <div className="mb-8 flex flex-col items-start gap-8 md:flex-row">
                      <div className="group/avatar relative flex-shrink-0 cursor-pointer">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-outline-variant">
                          <span className="flex h-full w-full items-center justify-center bg-surface-container-highest text-on-surface-variant">
                            <span className="material-symbols-outlined text-4xl" aria-hidden="true">
                              person
                            </span>
                          </span>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100">
                            <span className="material-symbols-outlined text-white" aria-hidden="true">
                              photo_camera
                            </span>
                          </div>
                        </div>
                        <input
                          ref={avatarInputRef}
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          aria-label={STRINGS.profil.avatarAria}
                        />
                      </div>
                      <div className="w-full flex-1 space-y-6">
                        <div>
                          <label
                            htmlFor="display-name"
                            className="mb-2 block font-label text-xs uppercase text-on-surface-variant"
                          >
                            {STRINGS.profil.displayNameLabel}
                          </label>
                          <input
                            id="display-name"
                            type="text"
                            placeholder={STRINGS.profil.displayNamePlaceholder}
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            className="w-full border-b border-outline-variant bg-transparent py-2 font-body text-base transition-colors focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="relative">
                          <label
                            htmlFor="email"
                            className="mb-2 block font-label text-xs uppercase text-on-surface-variant"
                          >
                            {STRINGS.profil.emailLabelTitle}
                          </label>
                          <input
                            id="email"
                            type="email"
                            disabled
                            placeholder={STRINGS.profil.emailPlaceholder}
                            value={email}
                            className="w-full cursor-not-allowed border-b border-outline-variant bg-transparent py-2 font-body text-base text-on-surface-variant focus:outline-none"
                          />
                          <span className="absolute right-0 top-1/2 mt-4 -translate-y-1/2 rounded-sm bg-background px-2 py-1 font-label text-[10px] uppercase text-on-surface-variant">
                            {STRINGS.profil.verifiedBadge}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded bg-primary px-8 py-3 font-label text-sm uppercase text-on-primary transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span>{STRINGS.profil.saveChanges}</span>
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              {/* Section 2: Preferensi */}
              <section>
                <SectionTitle number="02" label={STRINGS.profil.sectionPreferenceTitle} />
                <div className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-8 transition-all duration-300 hover:shadow-sm lg:p-12">
                  <form onSubmit={(event) => event.preventDefault()}>
                    <div className="mb-8 space-y-8">
                      <div className="flex items-center justify-between border-b border-outline-variant pb-6">
                        <div>
                          <h3 className="font-body text-base font-medium text-on-surface">
                            {STRINGS.profil.remindTitle}
                          </h3>
                          <p className="mt-1 font-body text-sm text-on-surface-variant">
                            {STRINGS.profil.remindBody}
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={emailReminder}
                            onChange={(event) => setEmailReminder(event.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-outline-variant transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2">
                            <span className="sr-only">{STRINGS.profil.remindToggleAria}</span>
                          </div>
                        </label>
                      </div>
                      <div>
                        <label
                          htmlFor="reminder-time"
                          className="mb-2 block font-label text-xs uppercase text-on-surface-variant"
                        >
                          {STRINGS.profil.reminderLabel}
                        </label>
                        <div className="relative">
                          <select
                            id="reminder-time"
                            value={reminderHour}
                            onChange={(event) => setReminderHour(event.target.value)}
                            className="w-full cursor-pointer appearance-none rounded-none border-b border-outline-variant bg-transparent py-2 pr-8 font-body text-base transition-colors focus:border-primary focus:outline-none"
                          >
                            {REMINDER_HOURS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span
                            className="material-symbols-outlined pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant"
                            aria-hidden="true"
                          >
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded bg-primary px-8 py-3 font-label text-sm uppercase text-on-primary transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span>{STRINGS.profil.savePreference}</span>
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 lg:pl-8">
              <div className="sticky top-24">
                <section>
                  <SectionTitle number="03" label={STRINGS.profil.sectionSecurityTitle} />
                  <div className="rounded-lg border border-error/20 bg-error-container p-8">
                    <h3 className="mb-4 font-headline text-2xl font-bold text-error">
                      {STRINGS.profil.dangerTitle}
                    </h3>
                    <p className="mb-8 font-body text-base text-on-error-container">
                      {STRINGS.profil.dangerBody}
                    </p>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded border-2 border-error bg-transparent px-6 py-3 font-label text-sm uppercase text-error transition-all duration-300 hover:bg-error hover:text-white focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        logout
                      </span>
                      <span>{STRINGS.profil.logout}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}