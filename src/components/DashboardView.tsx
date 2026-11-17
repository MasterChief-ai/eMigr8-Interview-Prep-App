import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileEdit,
  Link2,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  BehavioralTheme,
  PracticeSession,
  StorySlot,
  UserProfile,
} from "../types";
import { isDateOlderThanTwoYears } from "../utils/storage";

interface DashboardViewProps {
  profile: UserProfile | null;
  themes: BehavioralTheme[];
  stories: StorySlot[];
  practiceSessions: PracticeSession[];
  onOpenStory: (storyId: string) => void;
  onStartPractice: (themeId?: string) => void;
}

type FilterMode = "all" | "thin" | "covered" | "overused";

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  themes,
  stories,
  practiceSessions,
  onOpenStory,
  onStartPractice,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(() => {
    const readyStories = stories.filter((s) => s.status === "READY").length;
    const draftStories = stories.filter((s) => s.status === "DRAFT").length;
    const overusedStories = stories.filter((s) => s.practiceUseCount > 3).length;

    const themeStats = themes.map((theme) => {
      const slots = stories.filter((s) => s.themeId === theme.id);
      const readyInTheme = slots.filter((s) => s.status === "READY").length;
      const hasOverused = slots.some((s) => s.practiceUseCount > 3);
      return {
        theme,
        slots,
        readyInTheme,
        isThin: readyInTheme === 0,
        hasOverused,
      };
    });

    const thinThemeCount = themeStats.filter((t) => t.isThin).length;
    const coveredThemeCount = themeStats.length - thinThemeCount;

    return {
      readyStories,
      draftStories,
      overusedStories,
      thinThemeCount,
      coveredThemeCount,
      themeStats,
    };
  }, [stories, themes]);

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stats.themeStats.filter((entry) => {
      if (filterMode === "thin" && !entry.isThin) return false;
      if (filterMode === "covered" && entry.isThin) return false;
      if (filterMode === "overused" && !entry.hasOverused) return false;

      if (!q) return true;
      const inTheme =
        entry.theme.name.toLowerCase().includes(q) ||
        entry.theme.description.toLowerCase().includes(q);
      const inSlots = entry.slots.some(
        (s) =>
          s.oneLineSummary.toLowerCase().includes(q) ||
          s.situation.toLowerCase().includes(q) ||
          s.action.toLowerCase().includes(q)
      );
      return inTheme || inSlots;
    });
  }, [stats.themeStats, filterMode, searchQuery]);

  const confidenceDelta = profile
    ? profile.currentConfidence - profile.initialConfidence
    : 0;
  const sessionsCount = practiceSessions.length;
  const coreProgressPct = Math.min(100, Math.round((stats.readyStories / 10) * 100));
  const fullProgressPct = Math.min(100, Math.round((stats.readyStories / 30) * 100));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            UK Behavioral Story Bank
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Build verifiable STAR examples across 10 core UK employer competencies. Target 10 Ready stories first, then deepen to 30.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStartPractice()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B192C] px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <span>Run Practice Simulator</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Top KPI Bar */}
      <section aria-label="Progress Summary" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Primary v1 Goal */}
        <div className="rounded-xl border border-emerald-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">
              Core Milestone (v1 Goal)
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {coreProgressPct}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {Math.min(stats.readyStories, 10)}
            </span>
            <span className="font-mono text-base font-medium text-slate-500 tabular-nums">
              / 10 Ready Stories
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${coreProgressPct}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-slate-600">
            {stats.coveredThemeCount} of 10 themes covered · {stats.thinThemeCount} thin themes
          </p>
        </div>

        {/* Full Bank Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Full Bank Progress
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {fullProgressPct}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats.readyStories}
            </span>
            <span className="font-mono text-base font-medium text-slate-500 tabular-nums">
              / 30 Ready Stories
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0B192C] transition-all duration-300"
              style={{ width: `${fullProgressPct}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-slate-600">
            {stats.draftStories} in draft · {30 - stats.readyStories - stats.draftStories} empty slots
          </p>
        </div>

        {/* Confidence Delta */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Confidence Delta
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {sessionsCount} {sessionsCount === 1 ? "session" : "sessions"} logged
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {profile ? `${profile.initialConfidence} → ${profile.currentConfidence}` : "—"}
            </span>
            {profile && (
              <span
                className={`inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${
                  confidenceDelta > 0
                    ? "text-emerald-700"
                    : confidenceDelta < 0
                    ? "text-amber-700"
                    : "text-slate-500"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {confidenceDelta >= 0 ? `+${confidenceDelta}` : confidenceDelta}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            {sessionsCount < 3
              ? `Complete ${3 - sessionsCount} more practice ${
                  3 - sessionsCount === 1 ? "session" : "sessions"
                } to unlock your post-practice confidence re-rating.`
              : profile?.confidenceUpdatedAtSession !== null
              ? `Updated after Practice Session #${profile?.confidenceUpdatedAtSession}.`
              : "3+ practice sessions completed — re-rate your confidence in Practice Simulator."}
          </p>
        </div>
      </section>

      {/* Theme Coverage Matrix */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              10-Theme Readiness Coverage
            </h2>
            <p className="text-xs text-slate-600">
              Themes with 0 Ready stories are flagged as Thin Themes. Stories used more than 3 times in practice are flagged Overused.
            </p>
          </div>
          {stats.overusedStories > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {stats.overusedStories} overused {stats.overusedStories === 1 ? "story" : "stories"} (&gt;3x practice)
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
          {stats.themeStats.map(({ theme, slots, readyInTheme, isThin, hasOverused }) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onOpenStory(slots[0].id)}
              title={`${theme.name}: ${readyInTheme}/3 Ready`}
              className={`group flex flex-col justify-between rounded-lg border p-2.5 text-left transition-colors ${
                isThin
                  ? "border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50"
                  : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                  {String(theme.number).padStart(2, "0")}
                </span>
                {hasOverused ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                ) : isThin ? (
                  <span className="text-[10px] font-semibold text-amber-700">Thin</span>
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-medium text-slate-800 group-hover:text-slate-950">
                {theme.name}
              </p>
              <span className="mt-2 font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                {readyInTheme}/3 Ready
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
          role="tablist"
          aria-label="Filter themes"
        >
          {(
            [
              { id: "all", label: `All Themes (${themes.length})` },
              { id: "thin", label: `Thin Themes (${stats.thinThemeCount})` },
              { id: "covered", label: `Covered (${stats.coveredThemeCount})` },
              { id: "overused", label: `Overused (${stats.overusedStories})` },
            ] as Array<{ id: FilterMode; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filterMode === tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filterMode === tab.id
                  ? "bg-[#0B192C] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes or story summaries..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
      </div>

      {/* 10 Themes & 30 Story Slots */}
      {filteredThemes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            No themes match the current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setSearchQuery("");
            }}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredThemes.map(({ theme, slots, readyInTheme, isThin }) => (
            <article
              key={theme.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-500 tabular-nums">
                        Theme {String(theme.number).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-mono font-medium tabular-nums ${
                          readyInTheme > 0 ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {readyInTheme}/3 Ready
                      </span>
                      {isThin && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Thin Theme
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      {theme.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartPractice(theme.id)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Practice Theme
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {theme.description}
                </p>
              </div>

              {/* 3 Story Slots */}
              <div className="divide-y divide-slate-100">
                {slots.map((slot) => {
                  const isOutdated = isDateOlderThanTwoYears(slot.dateOccurred);
                  const isOverused = slot.practiceUseCount > 3;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onOpenStory(slot.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-slate-500 tabular-nums">
                            Slot {slot.slotIndex}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          {slot.status === "READY" ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Ready
                            </span>
                          ) : slot.status === "DRAFT" ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <FileEdit className="h-3.5 w-3.5 text-slate-500" />
                              Draft
                            </span>
                          ) : (
                            <span className="text-slate-400">Empty</span>
                          )}

                          {slot.status !== "EMPTY" && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <Link2 className="h-3 w-3 text-slate-400" />
                                {slot.proofStatus}
                              </span>
                            </>
                          )}

                          {slot.dateOccurred && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                                  isOutdated ? "font-medium text-amber-700" : "text-slate-500"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {slot.dateOccurred}
                                {isOutdated ? " (>2 yrs)" : ""}
                              </span>
                            </>
                          )}

                          {slot.practiceUseCount > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span
                                className={`font-mono tabular-nums ${
                                  isOverused ? "font-semibold text-amber-700" : "text-slate-500"
                                }`}
                              >
                                Used {slot.practiceUseCount}x
                                {isOverused ? " · Overused" : ""}
                              </span>
                            </>
                          )}
                        </div>

                        <p
                          className={`mt-1 truncate text-sm ${
                            slot.oneLineSummary.trim()
                              ? "font-medium text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {slot.oneLineSummary.trim() ||
                            (slot.situation.trim()
                              ? slot.situation.trim()
                              : "Empty slot — click to extract a real example with AI coach")}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
                        {slot.status === "EMPTY" ? "Start" : "Open"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
