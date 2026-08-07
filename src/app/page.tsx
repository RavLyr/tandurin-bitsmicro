import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { STRINGS } from "@/lib/i18n";
import { LandingHeader } from "@/components/landing/landing-header";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { KanbanPreview } from "@/components/landing/kanban-preview";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: STRINGS.brand.metaTitle,
  description:
    "Asisten tanam pribadi berbasis AI. Analisis kondisi lahammu, dapatkan rekomendasi komoditas, dan jadwal tugas harian di papan tugas realtime.",
};

export default async function LandingPage() {
  const authed = await resolveAuthed();

  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-button focus:text-sm focus:text-primary focus:shadow-md"
      >
        {STRINGS.landing.skipLink}
      </a>
      <LandingHeader authed={authed} />
      <main id="konten">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <KanbanPreview />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

async function resolveAuthed(): Promise<boolean> {
  // Env keys may be placeholders outside production, so a session check must
  // never break the public page — render the logged-out header in that case.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}