"use client";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { KanbanBoard } from "@/components/kanban/board";
import { LandGate } from "@/components/land-gate";
import { DailyChecklist } from "@/components/checklist/daily-checklist";

/**
 * /dashboard — Kanban board (T-304, F-06) + "Tugas Hari Ini" recurring view
 * (T-16, F-05). Data + drag-drop + realtime live in <KanbanBoard>; the page
 * just mounts the app shell. <LandGate> blocks the board until the user has
 * at least one land (F-07 precondition).
 */
export default function DashboardPage() {
  return (
    <>
      <AppHeader activePath="dashboard" />
      <main className="flex min-h-screen w-full flex-col pt-16">
        <LandGate>
          <KanbanBoard />
          <div className="mx-auto w-full max-w-6xl px-4 pb-8 lg:px-8">
            <DailyChecklist />
          </div>
        </LandGate>
      </main>
      <BottomNav activePath="dashboard" />
    </>
  );
}