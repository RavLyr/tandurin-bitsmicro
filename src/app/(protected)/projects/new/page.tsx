"use client";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProjectForm } from "@/components/projects/project-form";
import { STRINGS } from "@/lib/i18n";

/**
 * /projects/new — manual project creation (T-19, F-02). Full-page form;
 * submit redirects to /dashboard where the new project becomes active
 * (updated_at heuristic in /api/projects/active).
 */
export default function NewProjectPage() {
  return (
    <>
      <AppHeader activePath="lahan" />
      <main className="w-full pt-16">
        <div className="bg-surface-container-low px-5 pb-10 pt-12 lg:px-16 lg:pt-16">
          <div className="flex flex-col gap-3">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-primary">
              {STRINGS.projects.formEyebrow}
            </span>
            <h1 className="font-display -ml-2 text-4xl font-bold text-primary lg:text-5xl">
              {STRINGS.projects.formTitle}
            </h1>
            <p className="max-w-lg font-body text-sm text-on-surface-variant">
              {STRINGS.projects.formBody}
            </p>
          </div>
        </div>
        <div className="px-5 py-8 lg:px-16">
          <div className="max-w-2xl rounded-2xl border border-outline-variant bg-surface p-6 shadow-[0_4px_12px_rgb(0_0_0/0.06)]">
            <ProjectForm />
          </div>
        </div>
        <div className="h-8" />
      </main>
      <BottomNav activePath="lahan" />
    </>
  );
}