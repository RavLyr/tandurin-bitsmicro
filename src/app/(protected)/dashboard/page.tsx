"use client";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { KanbanBoard } from "@/components/kanban/board";
import { LandGate } from "@/components/land-gate";

/**
 * /dashboard — Kanban board (T-304, F-06). Data + drag-drop + realtime all
 * live in <KanbanBoard>; the page just mounts the app shell. <LandGate>
 * blocks the board until the user has at least one land (F-07 precondition).
 */
export default function DashboardPage() {
  return (
    <>
      <AppHeader activePath="dashboard" />
      <main className="flex min-h-screen w-full flex-col pt-16">
        <LandGate>
          <KanbanBoard />
        </LandGate>
      </main>
      <BottomNav activePath="dashboard" />
    </>
  );
}