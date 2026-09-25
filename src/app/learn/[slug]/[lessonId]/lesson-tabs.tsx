"use client";

import { useState } from "react";
import { Bot, ListChecks, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  notes: React.ReactNode;
  quiz: React.ReactNode;
  tutor: React.ReactNode;
  className?: string;
};

export function LessonTabs({ notes, quiz, tutor, className }: Props) {
  const tabs = [
    notes ? { id: "notes", label: "Notes", icon: NotebookText, content: notes } : null,
    quiz ? { id: "quiz", label: "Quiz", icon: ListChecks, content: quiz } : null,
    { id: "tutor", label: "AI Tutor", icon: Bot, content: tutor },
  ].filter((t) => t !== null);

  const [selected, setActive] = useState(tabs[0].id);
  // State survives client navigation between lessons; fall back if the next lesson lacks that tab.
  const active = tabs.some((t) => t.id === selected) ? selected : tabs[0].id;

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            onClick={() => setActive(id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium",
              active === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {/* Panels stay mounted so chat and quiz state survive tab switches. */}
      {tabs.map(({ id, content }) => (
        <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={active !== id} className="pt-6">
          {content}
        </div>
      ))}
    </div>
  );
}
