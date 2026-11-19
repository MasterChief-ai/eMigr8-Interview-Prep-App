import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import {
  BehavioralTheme,
  PracticeEvaluation,
  PracticeSession,
  StorySlot,
  UserProfile,
} from "../types";
import { postJson } from "../utils/api";

interface PracticeSimulatorViewProps {
  profile: UserProfile | null;
  themes: BehavioralTheme[];
  stories: StorySlot[];
  practiceSessions: PracticeSession[];
  initialThemeId?: string | null;
  onCompleteSession: (session: PracticeSession) => void;
  onUpdateConfidence: (newConfidence: number) => void;
  onOpenStory: (storyId: string) => void;
}

interface GeneratedQuestion {
  themeId: string;
  themeName: string;
  question: string;
  interviewerContext: string;
  whatUkPanelLooksFor: string;
}

export const PracticeSimulatorView: React.FC<PracticeSimulatorViewProps> = ({
  profile,
  themes,
  stories,
  practiceSessions,
  initialThemeId,
  onCompleteSession,
  onUpdateConfidence,
  onOpenStory,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    initialThemeId || themes[0].id
  );
  const [currentQuestion, setCurrentQuestion] =
    useState<GeneratedQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const [showHints, setShowHints] = useState(false);
  const [taggedStoryId, setTaggedStoryId] = useState<string>("");
  const [answer, setAnswer] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [latestEvaluation, setLatestEvaluation] =
    useState<PracticeEvaluation | null>(null);

  const [reRateValue, setReRateValue] = useState<number>(
    profile?.currentConfidence ?? 6
  );
  const [confidenceSavedNotice, setConfidenceSavedNotice] = useState(false);

  const activeTheme =
    themes.find((t) => t.id === (currentQuestion?.themeId || selectedThemeId)) ??
    themes[0];

  const themeStories = useMemo(
    () => stories.filter((s) => s.themeId === activeTheme.id),
    [stories, activeTheme.id]
  );

  const summaryHints = useMemo(
    () =>
      themeStories.filter((s) => s.oneLineSummary.trim().length > 0),
    [themeStories]
  );

  const wordCount = useMemo(() => {
    const trimmed = answer.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [answer]);

  const estimatedSeconds = Math.round((wordCount / 130) * 60);

  const generateQuestion = async (randomTheme: boolean) => {
    const targetTheme = randomTheme
      ? themes[Math.floor(Math.random() * themes.length)]
      : themes.find((t) => t.id === selectedThemeId) ?? themes[0];

    setSelectedThemeId(targetTheme.id);
    setQuestionLoading(true);
    setQuestionError("");
    setLatestEvaluation(null);
    setEvalError("");
    setAnswer("");
    setShowHints(false);
    setTaggedStoryId("");

    const previousQuestions = practiceSessions
      .filter((s) => s.themeId === targetTheme.id)
      .slice(0, 5)
      .map((s) => s.question);

    try {
      const data = await postJson<{
        question: string;
        interviewerContext: string;
        whatUkPanelLooksFor: string;
      }>("/api/practice/question", {
        profile,
        theme: {
          name: targetTheme.name,
          description: targetTheme.description,
        },
        previousQuestions,
      });

      setCurrentQuestion({
        themeId: targetTheme.id,
        themeName: targetTheme.name,
        question: data.question,
        interviewerContext: data.interviewerContext,
        whatUkPanelLooksFor: data.whatUkPanelLooksFor,
      });
    } catch (err) {
      setQuestionError(
        err instanceof Error ? err.message : "Failed to load question."
      );
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !answer.trim() || evalLoading) return;

    setEvalLoading(true);
    setEvalError("");

    try {
      const data = await postJson<PracticeEvaluation>("/api/practice/evaluate", {
        profile,
        theme: {
          name: currentQuestion.themeName,
          description: activeTheme.description,
        },
        question: currentQuestion.question,
        answer: answer.trim(),
      });

      const evaluation: PracticeEvaluation = {
        starStructureScore: Number(data.starStructureScore) || 1,
        specificityFeedback: String(data.specificityFeedback || ""),
        concisenessFeedback: String(data.concisenessFeedback || ""),
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        followUpQuestion: String(data.followUpQuestion || ""),
        matchedThemeAlignment: String(data.matchedThemeAlignment || ""),
      };

      const newSession: PracticeSession = {
        id: `session-${Date.now()}`,
        themeId: currentQuestion.themeId,
        themeName: currentQuestion.themeName,
        question: currentQuestion.question,
        interviewerContext: currentQuestion.interviewerContext,
        answer: answer.trim(),
        wordCount,
        usedStoryId: taggedStoryId || null,
        evaluation,
        createdAt: new Date().toISOString(),
      };

      setLatestEvaluation(evaluation);
      onCompleteSession(newSession);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to grade response."
      );
    } finally {
      setEvalLoading(false);
    }
  };

  const showConfidenceReRatePrompt =
    profile !== null &&
    practiceSessions.length >= 3 &&
    profile.confidenceUpdatedAtSession === null;

  const confidenceDelta = profile
    ? profile.currentConfidence - profile.initialConfidence
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            UK Hiring Manager Practice Simulator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Practise answering under realistic UK interview conditions without reading full STAR scripts.
          </p>
        </div>
        <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
          Sessions Completed: {practiceSessions.length}
        </span>
      </div>

      {/* Post-Session #3 Confidence Re-Rating Prompt */}
      {showConfidenceReRatePrompt && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-emerald-800">
                Milestone Reached · {practiceSessions.length} Practice Sessions Completed
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                Re-rate your current UK interview confidence
              </h2>
              <p className="mt-1 text-xs text-slate-700">
                Your initial baseline was{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {profile.initialConfidence}/10
                </span>
                . Rate how confident you feel now to calculate your Confidence Delta.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-2.5">
                <SlidersHorizontal className="h-4 w-4 text-emerald-700 shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  aria-label="Updated confidence rating"
                  value={reRateValue}
                  onChange={(e) => setReRateValue(Number(e.target.value))}
                  className="w-32 accent-emerald-600 cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {reRateValue}/10
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateConfidence(reRateValue);
                  setConfidenceSavedNotice(true);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white whitespace-nowrap shrink-0 hover:bg-emerald-700"
              >
                Save Confidence Score
              </button>
            </div>
          </div>
        </section>
      )}

      {confidenceSavedNotice && profile && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-5 py-3.5 text-sm">
          <span className="flex items-center gap-2 font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Confidence updated: Initial {profile.initialConfidence}/10 → Current{" "}
            {profile.currentConfidence}/10 (
            {confidenceDelta >= 0 ? `+${confidenceDelta}` : confidenceDelta} delta)
          </span>
        </div>
      )}

      {/* Question Selection Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label
              htmlFor="practice-theme-select"
              className="block text-xs font-semibold text-slate-800"
            >
              Target Behavioral Theme
            </label>
            <select
              id="practice-theme-select"
              value={selectedThemeId}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            >
              {themes.map((t) => {
                const readyCount = stories.filter(
                  (s) => s.themeId === t.id && s.status === "READY"
                ).length;
                return (
                  <option key={t.id} value={t.id}>
                    {String(t.number).padStart(2, "0")}. {t.name} ({readyCount}/3 Ready)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => generateQuestion(false)}
              disabled={questionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              {questionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Ask Selected Theme
            </button>

            <button
              type="button"
              onClick={() => generateQuestion(true)}
              disabled={questionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              <Shuffle className="h-4 w-4" />
              Random UK Interview Question
            </button>
          </div>
        </div>

        {questionError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {questionError}
          </div>
        )}
      </section>

      {/* Active Simulator Workspace */}
      {!currentQuestion && !questionLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            Ready to start a timed-pace text simulation
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600">
            Select a theme above or draw a random UK interview question. Your full STAR notes remain hidden during your answer—only One-Line Recall Summaries are available as an optional hint.
          </p>
          <button
            type="button"
            onClick={() => generateQuestion(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Shuffle className="h-4 w-4" />
            Draw Random UK Question
          </button>
        </div>
      )}

      {questionLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-700" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            UK Hiring Manager is preparing your behavioral question...
          </p>
        </div>
      )}

      {currentQuestion && !questionLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Question & Answer Form */}
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-emerald-700">
                  {currentQuestion.themeName}
                </span>
                <span>{currentQuestion.interviewerContext}</span>
              </div>

              <blockquote className="mt-3 text-lg font-semibold leading-snug text-slate-900">
                &ldquo;{currentQuestion.question}&rdquo;
              </blockquote>

              {/* Hint Toggle — Strictly ONLY One-Line Summaries */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHints((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-950"
                >
                  {showHints ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hide One-Line Story Summaries
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Show One-Line Story Summaries (Hint)
                    </>
                  )}
                </button>

                {showHints && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    {summaryHints.length === 0 ? (
                      <p className="text-xs text-slate-600">
                        No One-Line Recall Summaries saved for this theme yet. Answer from memory and bank it afterward.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {summaryHints.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>
                              <span className="font-mono font-semibold text-slate-500">
                                Slot {s.slotIndex}:
                              </span>{" "}
                              {s.oneLineSummary}
                            </span>
                            {s.practiceUseCount > 3 && (
                              <span className="font-medium text-amber-700 whitespace-nowrap">
                                Overused ({s.practiceUseCount}x)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Answer Form */}
              <form onSubmit={handleSubmitAnswer} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="tagged-story"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tag Story Used (tracks overuse across sessions)
                  </label>
                  <select
                    id="tagged-story"
                    value={taggedStoryId}
                    onChange={(e) => setTaggedStoryId(e.target.value)}
                    disabled={Boolean(latestEvaluation)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none disabled:opacity-70"
                  >
                    <option value="">Unbanked / Spontaneous example</option>
                    {themeSlotsOptionList(themeStories)}
                  </select>
                  {taggedStoryId &&
                    (stories.find((s) => s.id === taggedStoryId)?.practiceUseCount ??
                      0) >= 3 && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Heads up: You have used this story 3+ times. Consider building another slot in this theme for variety.
                      </p>
                    )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="practice-answer"
                      className="block text-xs font-semibold text-slate-800"
                    >
                      Your Response (Write as you would speak)
                    </label>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {wordCount} words · ~{estimatedSeconds}s spoken
                    </span>
                  </div>
                  <textarea
                    id="practice-answer"
                    rows={9}
                    value={answer}
                    disabled={Boolean(latestEvaluation)}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Structure with brief Situation & Task (~20%), detailed personal Action ('I...') (~60%), and specific measurable Result (~20%)..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-50"
                  />
                </div>

                {evalError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                    {evalError}
                  </div>
                )}

                {!latestEvaluation && (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      Target UK interview length: ~200–350 words (90–160 seconds).
                    </p>
                    <button
                      type="submit"
                      disabled={evalLoading || answer.trim().length < 20}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {evalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Grading Response...
                        </>
                      ) : (
                        <>
                          Submit Answer for Grading
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Evaluation Panel */}
          <div className="lg:col-span-5">
            {!latestEvaluation ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-900">
                  UK Hiring Manager Rubric
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {currentQuestion.whatUkPanelLooksFor}
                </p>
                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">
                      1. STAR Structure (1–5):
                    </span>{" "}
                    Clear narrative arc without losing the thread.
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      2. Specificity:
                    </span>{" "}
                    Personal &ldquo;I&rdquo; ownership, dates, and concrete metrics.
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      3. Conciseness &amp; Length:
                    </span>{" "}
                    Flags rambling background setup or rushed results.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      UK Hiring Manager Evaluation
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                      STAR Structure Score
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                      {latestEvaluation.starStructureScore} / 5
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-2 rounded-full ${
                        n <= latestEvaluation.starStructureScore
                          ? "bg-emerald-600"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="font-semibold text-slate-900">
                      Specificity &amp; Personal Ownership
                    </p>
                    <p className="mt-1 text-slate-700">
                      {latestEvaluation.specificityFeedback}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="font-semibold text-slate-900">
                      Conciseness &amp; Length ({wordCount} words)
                    </p>
                    <p className="mt-1 text-slate-700">
                      {latestEvaluation.concisenessFeedback}
                    </p>
                  </div>

                  {latestEvaluation.strengths.length > 0 && (
                    <div>
                      <p className="font-semibold text-emerald-800">Strengths</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                        {latestEvaluation.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestEvaluation.improvements.length > 0 && (
                    <div>
                      <p className="font-semibold text-amber-800">
                        How to Tighten This Answer
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                        {latestEvaluation.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3">
                    <p className="font-semibold text-slate-900">
                      Likely Follow-Up Question from Panel
                    </p>
                    <p className="mt-1 italic text-slate-700">
                      &ldquo;{latestEvaluation.followUpQuestion}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => generateQuestion(true)}
                    className="rounded-lg bg-[#0B192C] px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Next Random Question
                  </button>
                  {taggedStoryId && (
                    <button
                      type="button"
                      onClick={() => onOpenStory(taggedStoryId)}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Refine Tagged Story
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function themeSlotsOptionList(themeStories: StorySlot[]) {
  return themeStories.map((slot) => (
    <option key={slot.id} value={slot.id}>
      Slot {slot.slotIndex}:{" "}
      {slot.oneLineSummary.trim() || "(No summary yet)"}{" "}
      {slot.practiceUseCount > 0 ? `[Used ${slot.practiceUseCount}x]` : ""}
    </option>
  ));
}
