"use client";

import { Markdown } from "@/components/markdown";
import { cleanAssistantContent, type MessageMetadata, type MessageRole } from "./chat-thread";
import { RecommendationCard } from "./recommendation-card";
import { DiagnosisCard } from "./diagnosis-card";
import { TaskSummaryCard } from "./task-summary-card";

/**
 * Single chat bubble (F-02 §4.3): user right-aligned on primary, assistant
 * left on surface with markdown rendering and contextual cards driven by the
 * message metadata (recommendation / diagnosis / task-summary).
 */
export function MessageBubble({
  role,
  content,
  metadata,
  disabled,
  onCreateProject,
  onConfirm,
}: {
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  disabled?: boolean;
  onCreateProject?: (crops: string[]) => void;
  onConfirm?: () => void;
}) {
  if (role === "user") {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tr-none bg-primary px-4 py-3 font-body text-sm leading-relaxed text-on-primary md:max-w-[70%]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[92%] rounded-lg rounded-tl-none border border-outline-variant bg-surface px-4 py-3 md:max-w-[78%]">
        {content.trim() ? <Markdown content={cleanAssistantContent(content)} /> : null}
        {metadata?.type === "recommendation" ? (
          <div className="mt-3">
            <RecommendationCard
              data={metadata.recommendations}
              disabled={disabled}
              onCreateProject={onCreateProject}
              onConfirm={onConfirm}
            />
          </div>
        ) : null}
        {metadata?.type === "diagnosis" ? (
          <div className="mt-3">
            <DiagnosisCard
              data={metadata.diagnostics}
              imagePath={metadata.image_path}
            />
          </div>
        ) : null}
        {metadata?.type === "task-summary" ? (
          <div className="mt-3">
            <TaskSummaryCard tasks={metadata.tasks} />
          </div>
        ) : null}
      </div>
    </div>
  );
}