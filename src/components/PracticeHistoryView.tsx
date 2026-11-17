import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquareText } from "lucide-react";
import { PracticeSession, StorySlot } from "../types";

interface PracticeHistoryViewProps {
  sessions: PracticeSession[];
  stories: StorySlot[];
  onGoToPractice: () => void;
}

export const PracticeHistoryView: React.FC<PracticeHistoryViewProps> = ({
  sessions,
  stories,
  onGoToPractice,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    sessions[0]?.id ?? null
  );

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Practice Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Completed UK Hiring Manager simulations and scoring history.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No practice sessions recorded yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Complete 3 practice sessions in the simulator to benchmark your STAR scores and unlock your Confidence Delta re-rating.
          </p>
          <button
            type="button"
            onClick={onGoToPractice}
            className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start First Practice Session
          </button>
        </div>
      </div>
    );
  }

  const avgScore = (
    sessions.reduce((acc, s) => acc + s.evaluation.starStructureScore, 0) /
    sessions.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Practice Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review past responses, STAR structure ratings, and Hiring Manager follow-up probes.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Total: <strong className="text-slate-900">{sessions.length}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Avg STAR Score:{" "}
            <strong className="text-emerald-700">{avgScore} / 5</strong>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session, idx) => {
          const isOpen = expandedId === session.id;
          const sessionNumber = sessions.length - idx;
          const taggedStory = session.usedStoryId
            ? stories.find((s) => s.id === session.usedStoryId)
            : null;
          const dateLabel = new Date(session.createdAt).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" }
          );

          return (
            <article
              key={session.id}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : session.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      Session #{sessionNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{session.themeName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{dateLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {session.wordCount} words
                    </span>
                    {taggedStory && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate text-slate-600">
                          Slot {taggedStory.slotIndex}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {session.question}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                    {session.evaluation.starStructureScore}/5
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 px-5 py-4 space-y-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-700">Your Answer</p>
                    <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800">
                      {session.answer}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <p className="font-semibold text-slate-900">Specificity</p>
                      <p className="mt-1 leading-relaxed text-slate-700">
                        {session.evaluation.specificityFeedback}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <p className="font-semibold text-slate-900">
                        Conciseness &amp; Pacing
                      </p>
                      <p className="mt-1 leading-relaxed text-slate-700">
                        {session.evaluation.concisenessFeedback}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="font-semibold text-slate-900">
                      Follow-Up Question
                    </p>
                    <p className="mt-1 italic text-slate-700">
                      &ldquo;{session.evaluation.followUpQuestion}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
