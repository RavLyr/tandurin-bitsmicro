"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { STRINGS } from "@/lib/i18n";

/**
 * /profil — Profile settings (T-404, F-10, DESIGN §4.6).
 * Three cards: Profil (avatar + display name + read-only email),
 * Preferensi Pengingat (email toggle + daily hour 0-23), Akun (logout).
 * Each card saves itself via PATCH /api/profil (partial update).
 * ponytail: per-card save buttons (no dirty-state tracking); upgrade path =
 * shared form primitives (T-005).
 */

const REMINDER_HOURS = STRINGS.profil.reminderOptions;

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  notification_email_preference: boolean | null;
  reminder_hour: number | null;
  email: string | null;
}

function SectionTitle({ number, label }: { number: string; label: string }) {
  return (
    <h2 className="mb-6 flex items-center gap-4 text-xs font-label uppercase tracking-widest text-outline">
      <span className="h-[1px] w-8 bg-outline" />
      {number}. {label}
    </h2>
  );
}

async function patchProfile(body: Record<string, unknown>): Promise<Profile | string> {
  let response: Response;
  try {
    response = await fetch("/api/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return STRINGS.profil.saveFailed;
  }
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) return json.error ?? STRINGS.profil.saveFailed;
  return json as Profile;
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [reminderHour, setReminderHour] = useState("7");
  const [emailReminder, setEmailReminder] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profil");
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        toast(STRINGS.profil.saveFailed, "danger");
        return;
      }
      const data = (await response.json()) as Profile;
      setProfile(data);
      setDisplayName(data.display_name ?? "");
      setAvatarUrl(data.avatar_url);
      setEmailReminder(data.notification_email_preference ?? true);
      setReminderHour(data.reminder_hour != null ? String(data.reminder_hour) : "7");
    } catch {
      toast(STRINGS.profil.saveFailed, "danger");
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleAvatarUploaded = async (path: string) => {
    const result = await patchProfile({ avatar_url: path });
    if (typeof result === "string") {
      toast(STRINGS.profil.avatarUploadFailed, "danger");
      return;
    }
    setProfile(result);
    setAvatarUrl(result.avatar_url);
    toast(STRINGS.profil.saveSuccess);
  };

  const handleSaveProfile = async () => {
    const name = displayName.trim();
    if (name.length < 3 || name.length > 60) {
      toast(STRINGS.profil_errors.displayName, "danger");
      return;
    }
    setSavingProfile(true);
    try {
      const result = await patchProfile({ display_name: name, avatar_url: avatarUrl });
      if (typeof result === "string") {
        toast(result, "danger");
        return;
      }
      setProfile(result);
      toast(STRINGS.profil.saveSuccess);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreference = async () => {
    const hour = Number(reminderHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      toast(STRINGS.profil_errors.reminderHour, "danger");
      return;
    }
    setSavingPreference(true);
    try {
      const result = await patchProfile({
        notification_email_preference: emailReminder,
        reminder_hour: hour,
      });
      if (typeof result === "string") {
        toast(result, "danger");
        return;
      }
      setProfile(result);
      toast(STRINGS.profil.saveSuccess);
    } finally {
      setSavingPreference(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSendResetPassword = async () => {
    if (!email || sendingReset) return;
    setSendingReset(true);
    try {
      const supabase = createClient();
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, "");
      const redirectTo = `${base}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setResetSent(true);
    } catch {
      toast(STRINGS.profil.changePasswordFailed, "danger");
    } finally {
      setSendingReset(false);
    }
  };

  const email = profile?.email ?? "";

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

          {profile === null ? (
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="flex flex-col gap-12 lg:col-span-8">
                <Skeleton className="h-96 rounded-lg" />
                <Skeleton className="h-96 rounded-lg" />
              </div>
              <div className="lg:col-span-4">
                <Skeleton className="h-64 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="flex flex-col gap-12 lg:col-span-8">
                {/* Section 1: Profil */}
                <section>
                  <SectionTitle number="01" label={STRINGS.profil.sectionDataTitle} />
                  <div className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-8 transition-all duration-300 hover:shadow-sm lg:p-12">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveProfile();
                      }}
                    >
                      <div className="mb-8 flex flex-col items-start gap-8 md:flex-row">
                        <AvatarUpload avatarUrl={avatarUrl} onUploaded={(path) => void handleAvatarUploaded(path)} />
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
                          <div>
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
                              value={email}
                              placeholder={STRINGS.profil.emailPlaceholder}
                              className="w-full cursor-not-allowed border-b border-outline-variant bg-transparent py-2 font-body text-base text-on-surface-variant focus:outline-none"
                            />
                            <p className="mt-1 font-body text-xs text-on-surface-variant">
                              {STRINGS.profil.emailCannotChange}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="flex items-center gap-2 rounded bg-primary px-8 py-3 font-label text-sm uppercase text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <span>
                            {savingProfile ? STRINGS.common.loading : STRINGS.profil.saveChanges}
                          </span>
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                </section>

                {/* Section 2: Preferensi Pengingat */}
                <section>
                  <SectionTitle number="02" label={STRINGS.profil.sectionPreferenceTitle} />
                  <div className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-8 transition-all duration-300 hover:shadow-sm lg:p-12">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSavePreference();
                      }}
                    >
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
                          type="submit"
                          disabled={savingPreference}
                          className="flex items-center gap-2 rounded bg-primary px-8 py-3 font-label text-sm uppercase text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          <span>
                            {savingPreference ? STRINGS.common.loading : STRINGS.profil.savePreference}
                          </span>
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              </div>

              {/* Sidebar: Akun */}
              <div className="lg:col-span-4 lg:pl-8">
                <div className="sticky top-24">
                  <section>
                    <SectionTitle number="03" label={STRINGS.profil.sectionSecurityTitle} />
                    <div className="mb-6 rounded-lg border border-outline-variant bg-surface p-8">
                      <h3 className="mb-2 font-headline text-2xl font-bold text-on-surface">
                        {STRINGS.profil.changePasswordTitle}
                      </h3>
                      <p className="mb-6 font-body text-base text-on-surface-variant">
                        {STRINGS.profil.changePasswordBody}
                      </p>
                      {resetSent ? (
                        <p className="mb-4 font-body text-sm text-primary" role="status">
                          {STRINGS.profil.changePasswordSent}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleSendResetPassword()}
                        disabled={sendingReset || !email}
                        className="flex w-full items-center justify-center gap-2 rounded border-2 border-primary bg-primary px-6 py-3 font-label text-sm uppercase text-on-primary transition-all duration-300 hover:bg-surface hover:text-primary disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          key
                        </span>
                        <span>
                          {sendingReset ? STRINGS.common.loading : STRINGS.profil.changePasswordButton}
                        </span>
                      </button>
                    </div>
                    <div className="rounded-lg border border-error/20 bg-error-container p-8">
                      <h3 className="mb-4 font-headline text-2xl font-bold text-error">
                        {STRINGS.profil.dangerTitle}
                      </h3>
                      <p className="mb-8 font-body text-base text-on-error-container">
                        {STRINGS.profil.dangerBody}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
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
          )}
        </div>
      </main>
    </>
  );
}