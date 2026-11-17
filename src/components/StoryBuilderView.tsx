import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  BehavioralTheme,
  CoachMessage,
  ProofStatus,
  ReadinessEvaluation,
  StorySlot,
  UserProfile,
} from "../types";
import { isDateOlderThanTwoYears, isValidProofUrl } from "../utils/storage";

interface StoryBuilderViewProps {
  profile: UserProfile | null;
  themes: BehavioralTheme[];
  stories: StorySlot[];
  activeStoryId: string;
  onSelectStory: (storyId: string) => void;
  onUpdateStory: (storyId: string, updater: (prev: StorySlot) => StorySlot) => void;
  onBackToBank: () => void;
}

const STARTER_PROMPTS = [
  "Help me pick a real example from my recent work or study.",
  "I worked in a team on a project—help me separate what I personally did.",
  "I want to use a university or side project example for this theme.",
];

export const StoryBuilderView: React.FC<StoryBuilderViewProps> = ({
  profile,
  themes,
  stories,
  activeStoryId,
  onSelectStory,
  onUpdateStory,
  onBackToBank,
}) => {
  const story = stories.find((s) => s.id === activeStoryId) ?? stories[0];
  const theme = themes.find((t) => t.id === story.themeId) ?? themes[0];
  const themeSlots = stories.filter((s) => s.themeId === theme.id);

  const [chatInput, setChatInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [editedSinceCheck, setEditedSinceCheck] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCoachError("");
    setCheckError("");
    setEditedSinceCheck(false);
  }, [activeStoryId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [story.coachMessages.length, coachLoading]);

  const computeDraftStatus = (candidate: StorySlot): StorySlot["status"] => {
    const hasAnyContent =
      candidate.oneLineSummary.trim() ||
      candidate.dateOccurred.trim() ||
      candidate.situation.trim() ||
      candidate.task.trim() ||
      candidate.action.trim() ||
      candidate.result.trim();
    return hasAnyContent ? "DRAFT" : "EMPTY";
  };

  const handleFieldChange = (
    field:
      | "oneLineSummary"
      | "dateOccurred"
      | "situation"
      | "task"
      | "action"
      | "result"
      | "proofUrl",
    value: string
  ) => {
    if (
      story.readiness &&
      field !== "oneLineSummary" &&
      field !== "proofUrl"
    ) {
      setEditedSinceCheck(true);
    }

    onUpdateStory(story.id, (prev) => {
      const updated: StorySlot = {
        ...prev,
        [field]: value,
        updatedAt: new Date().toISOString(),
      };

      if (field === "proofUrl") {
        if (isValidProofUrl(value)) {
          updated.proofStatus = "Link Added";
        } else if (prev.proofStatus === "Link Added") {
          updated.proofStatus =
            prev.coachMessages.length > 0 ? "Guided Draft" : "Unverified";
        }
      }

      // Maintain Gatekeeper honesty: editing core STAR fields after READY moves back to DRAFT
      if (field !== "oneLineSummary" && field !== "proofUrl") {
        updated.status = computeDraftStatus(updated);
      }
      return updated;
    });
  };

  const handleProofStatusChange = (nextStatus: ProofStatus) => {
    onUpdateStory(story.id, (prev) => ({
      ...prev,
      proofStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    }));
  };

  const sendCoachMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? chatInput).trim();
    if (coachLoading) return;

    const userMsg: CoachMessage | null = trimmed
      ? {
          id: `msg-${Date.now()}-u`,
          role: "user",
          text: trimmed,
          timestamp: new Date().toISOString(),
        }
      : null;

    const nextMessages = userMsg
      ? [...story.coachMessages, userMsg]
      : [...story.coachMessages];

    if (userMsg) {
      setChatInput("");
      onUpdateStory(story.id, (prev) => ({
        ...prev,
        coachMessages: nextMessages,
        proofStatus:
          prev.proofStatus === "Unverified" && !isValidProofUrl(prev.proofUrl)
            ? "Guided Draft"
            : prev.proofStatus,
        updatedAt: new Date().toISOString(),
      }));
    }

    setCoachLoading(true);
    setCoachError("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          theme: { name: theme.name, description: theme.description },
          story: {
            oneLineSummary: story.oneLineSummary,
            dateOccurred: story.dateOccurred,
            situation: story.situation,
            task: story.task,
            action: story.action,
            result: story.result,
            proofUrl: story.proofUrl,
          },
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reach AI Extraction Coach.");
      }

      const assistantMsg: CoachMessage = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        text: data.reply,
        timestamp: new Date().toISOString(),
      };

      onUpdateStory(story.id, (prev) => ({
        ...prev,
        coachMessages: [...nextMessages, assistantMsg],
        proofStatus:
          prev.proofStatus === "Unverified" && !isValidProofUrl(prev.proofUrl)
            ? "Guided Draft"
            : prev.proofStatus,
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setCoachError(
        err instanceof Error ? err.message : "Failed to connect to coach."
      );
    } finally {
      setCoachLoading(false);
    }
  };

  const handleResetCoach = () => {
    onUpdateStory(story.id, (prev) => ({
      ...prev,
      coachMessages: [],
      updatedAt: new Date().toISOString(),
    }));
    setCoachError("");
  };

  const handleRunReadinessCheck = async () => {
    setCheckLoading(true);
    setCheckError("");

    try {
      const res = await fetch("/api/readiness-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          theme: { name: theme.name, description: theme.description },
          story: {
            oneLineSummary: story.oneLineSummary,
            dateOccurred: story.dateOccurred,
            situation: story.situation,
            task: story.task,
            action: story.action,
            result: story.result,
            proofUrl: story.proofUrl,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Readiness check failed.");
      }

      const evaluation: ReadinessEvaluation = {
        checkedAt: new Date().toISOString(),
        hasSpecificResult: Boolean(data.hasSpecificResult),
        clearPersonalOwnership: Boolean(data.clearPersonalOwnership),
        isRecent: Boolean(data.isRecent),
        jargonExplained: Boolean(data.jargonExplained),
        fixPrompts: Array.isArray(data.fixPrompts) ? data.fixPrompts : [],
        overallVerdict: String(data.overallVerdict || ""),
      };

      const allPassed =
        evaluation.hasSpecificResult &&
        evaluation.clearPersonalOwnership &&
        evaluation.isRecent &&
        evaluation.jargonExplained;

      setEditedSinceCheck(false);
      onUpdateStory(story.id, (prev) => ({
        ...prev,
        readiness: evaluation,
        status: allPassed ? "READY" : computeDraftStatus(prev),
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setCheckError(
        err instanceof Error ? err.message : "Failed to run readiness check."
      );
    } finally {
      setCheckLoading(false);
    }
  };

  const isOutdated = isDateOlderThanTwoYears(story.dateOccurred);
  const isOverused = story.practiceUseCount > 3;

  const readinessCriteria = story.readiness
    ? [
        {
          key: "hasSpecificResult",
          label: "Specific, measurable result",
          passed: story.readiness.hasSpecificResult,
        },
        {
          key: "clearPersonalOwnership",
          label: 'Clear personal ownership ("I" not "we")',
          passed: story.readiness.clearPersonalOwnership,
        },
        {
          key: "isRecent",
          label: "Recent example (within 2 years)",
          passed: story.readiness.isRecent,
        },
        {
          key: "jargonExplained",
          label: "Jargon explained in plain English",
          passed: story.readiness.jargonExplained,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Theme/Slot Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToBank}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Story Bank
          </button>

          <select
            aria-label="Select Behavioral Theme"
            value={theme.id}
            onChange={(e) => {
              const targetSlot = stories.find((s) => s.themeId === e.target.value);
              if (targetSlot) onSelectStory(targetSlot.id);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {String(t.number).padStart(2, "0")}. {t.name}
              </option>
            ))}
          </select>

          <div
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
            role="tablist"
            aria-label="Story Slots"
          >
            {themeSlots.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === story.id}
                onClick={() => onSelectStory(s.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  s.id === story.id
                    ? "bg-[#0B192C] text-white"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                Slot {s.slotIndex}
                {s.status === "READY" ? " · Ready" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {isOverused && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overused ({story.practiceUseCount}x in practice)
            </span>
          )}
          {story.status === "READY" ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Status: Ready
            </span>
          ) : story.status === "DRAFT" ? (
            <span className="font-medium text-slate-600">Status: Draft</span>
          ) : (
            <span className="text-slate-400">Status: Empty</span>
          )}
        </div>
      </div>

      {/* Split-Screen Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT PANE: AI Extraction Coach */}
        <section
          aria-label="AI Extraction Coach"
          className="flex flex-col rounded-xl border border-slate-200 bg-white lg:col-span-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                AI Extraction Coach
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Truthful recall only · No ghostwriting · Probes for &ldquo;I&rdquo;, dates &amp; metrics
              </p>
            </div>
            {story.coachMessages.length > 0 && (
              <button
                type="button"
                onClick={handleResetCoach}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="Clear conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Theme Context Banner */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <p className="text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-800">UK Panel Signal:</span>{" "}
              {theme.ukEmployerSignal}
            </p>
          </div>

          {/* Chat Transcript */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 min-h-[300px] max-h-[460px] lg:max-h-none">
            {story.coachMessages.length === 0 ? (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                    Extract a real story in your own words
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Work experience, university projects, volunteering, or side projects all count. The coach will challenge vague &ldquo;we&rdquo; phrasing and ask for dates, outcomes, and plain-English clarity.
                  </p>
                  <button
                    type="button"
                    onClick={() => sendCoachMessage()}
                    disabled={coachLoading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0B192C] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {coachLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Start Extraction Interview
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Or pick a starting prompt:
                  </p>
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={coachLoading}
                      onClick={() => sendCoachMessage(prompt)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-slate-900"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              story.coachMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#0B192C] text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {coachLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                  Coach is reviewing your input...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {coachError && (
            <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {coachError}
            </div>
          )}

          {/* Chat Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) sendCoachMessage();
            }}
            className="border-t border-slate-200 p-3.5"
          >
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim()) sendCoachMessage();
                  }
                }}
                placeholder="Describe what happened in rough notes..."
                className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
              <button
                type="submit"
                disabled={coachLoading || !chatInput.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                aria-label="Send message to coach"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT PANE: Structured STAR Card, Proof Layer & Readiness Gatekeeper */}
        <section
          aria-label="Structured STAR Card and Readiness Gatekeeper"
          className="space-y-6 lg:col-span-7"
        >
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Structured STAR Card &amp; Proof Layer
                </h2>
                <p className="text-xs text-slate-600">
                  Write factually in your own voice. All changes auto-save to your browser.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Slot {story.slotIndex} of 3
              </span>
            </div>

            <div className="mt-5 space-y-5">
              {/* Summary & Date Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="one-line-summary"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    One-Line Recall Summary
                  </label>
                  <input
                    id="one-line-summary"
                    type="text"
                    value={story.oneLineSummary}
                    onChange={(e) => handleFieldChange("oneLineSummary", e.target.value)}
                    placeholder="e.g. Resolved payment webhook timeout before Black Friday launch"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Used only as an optional recall cue in Practice Simulator.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="date-occurred"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Date Occurred (YYYY-MM)
                  </label>
                  <input
                    id="date-occurred"
                    type="month"
                    value={story.dateOccurred}
                    onChange={(e) => handleFieldChange("dateOccurred", e.target.value)}
                    className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      isOutdated
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                        : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20"
                    }`}
                  />
                  {isOutdated && (
                    <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Over 2 years old. UK hiring panels favour examples from the last 24 months.
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* STAR Fields */}
              <div>
                <label
                  htmlFor="star-situation"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Situation
                </label>
                <textarea
                  id="star-situation"
                  rows={2}
                  value={story.situation}
                  onChange={(e) => handleFieldChange("situation", e.target.value)}
                  placeholder="Context, team size, project stakes, and why it mattered (keep brief, ~20% of your answer)..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="star-task"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Task
                </label>
                <textarea
                  id="star-task"
                  rows={2}
                  value={story.task}
                  onChange={(e) => handleFieldChange("task", e.target.value)}
                  placeholder="What was your specific responsibility, constraint, or target?"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="star-action"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Action (Personal Ownership)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Use &ldquo;I&rdquo; statements · Explain jargon in plain English
                  </span>
                </div>
                <textarea
                  id="star-action"
                  rows={4}
                  value={story.action}
                  onChange={(e) => handleFieldChange("action", e.target.value)}
                  placeholder="Exactly what did YOU personally decide, build, analyse, or negotiate? Avoid hiding behind 'we'..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="star-result"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Result (Specific &amp; Verifiable)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Numbers, time saved, error reduction, or concrete outcome
                  </span>
                </div>
                <textarea
                  id="star-result"
                  rows={3}
                  value={story.result}
                  onChange={(e) => handleFieldChange("result", e.target.value)}
                  placeholder="What measurable outcome occurred, and what did you or the team change going forward?"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {/* Proof Artifact Layer */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="proof-url"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                  >
                    <Link2 className="h-3.5 w-3.5 text-slate-500" />
                    Proof Artifact URL (Optional)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Verification Status:</span>
                    <select
                      aria-label="Proof status"
                      value={story.proofStatus}
                      onChange={(e) =>
                        handleProofStatusChange(e.target.value as ProofStatus)
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                        story.proofStatus === "Link Added"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : story.proofStatus === "Guided Draft"
                          ? "border-slate-300 bg-slate-100 text-slate-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <option value="Unverified">Unverified</option>
                      <option value="Guided Draft">Guided Draft</option>
                      <option
                        value="Link Added"
                        disabled={!isValidProofUrl(story.proofUrl)}
                      >
                        Link Added
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="proof-url"
                    type="url"
                    value={story.proofUrl}
                    onChange={(e) => handleFieldChange("proofUrl", e.target.value)}
                    placeholder="https://github.com/username/repo or https://linkedin.com/posts/..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                  {isValidProofUrl(story.proofUrl) && (
                    <a
                      href={story.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Readiness Gatekeeper Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Readiness Gatekeeper
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  All 4 criteria must pass before this story counts toward your Ready milestone.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunReadinessCheck}
                disabled={checkLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                {checkLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking 4 Criteria...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Run Readiness Check
                  </>
                )}
              </button>
            </div>

            {checkError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {checkError}
              </div>
            )}

            {editedSinceCheck && story.readiness && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  You edited this STAR card after the previous check. Run Readiness Check again to verify Ready status.
                </span>
              </div>
            )}

            {story.readiness ? (
              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    story.status === "READY"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {story.readiness.overallVerdict}
                </div>

                {/* 4-Point Visual Readiness Checklist */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {readinessCriteria.map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                        item.passed
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-red-200 bg-red-50/40"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-medium text-slate-800">
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                        )}
                        {item.label}
                      </span>
                      <span
                        className={`text-[11px] font-semibold whitespace-nowrap ${
                          item.passed ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {item.passed ? "Passed" : "Fix Needed"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fix Prompts */}
                {story.readiness.fixPrompts.length > 0 && (
                  <div className="space-y-2.5 border-t border-slate-200 pt-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
                      <ShieldAlert className="h-4 w-4" />
                      Specific Fixes Required
                    </h4>
                    <div className="space-y-2">
                      {story.readiness.fixPrompts.map((fix, idx) => (
                        <div
                          key={`${fix.criterion}-${idx}`}
                          className="rounded-lg border border-red-200 bg-red-50/30 p-3.5 text-xs"
                        >
                          <p className="font-semibold text-slate-900">
                            {fix.criterion}
                          </p>
                          <p className="mt-1 text-red-800">{fix.issue}</p>
                          <p className="mt-1 text-slate-700">
                            <span className="font-semibold">Actionable fix:</span>{" "}
                            {fix.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600">
                Complete your STAR fields above and click{" "}
                <span className="font-semibold text-slate-800">
                  Run Readiness Check
                </span>{" "}
                to evaluate Specific Result, Personal Ownership, 2-Year Recency, and Plain-English Clarity.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
