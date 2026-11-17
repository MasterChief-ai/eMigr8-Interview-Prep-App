import React from "react";
import {
  BookOpenCheck,
  History,
  LayoutDashboard,
  MessageSquareText,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { ActiveView, UserProfile } from "../types";

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  profile: UserProfile | null;
  readyCount: number;
  practiceCount: number;
  onEditProfile: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  profile,
  readyCount,
  practiceCount,
  onEditProfile,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: Array<{
    id: ActiveView;
    label: string;
    meta?: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "dashboard",
      label: "Story Bank",
      meta: `${readyCount}/10`,
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    },
    {
      id: "builder",
      label: "Story Builder",
      icon: <BookOpenCheck className="h-4 w-4 shrink-0" />,
    },
    {
      id: "practice",
      label: "Practice Simulator",
      icon: <MessageSquareText className="h-4 w-4 shrink-0" />,
    },
    {
      id: "history",
      label: "Practice Logs",
      meta: practiceCount > 0 ? String(practiceCount) : undefined,
      icon: <History className="h-4 w-4 shrink-0" />,
    },
  ];

  const handleNav = (id: ActiveView) => {
    onSelectView(id);
    onCloseMobile();
  };

  const milestonePct = Math.min(100, Math.round((readyCount / 10) * 100));

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B192C] text-slate-100">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-5">
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            eMigr8
          </span>
          <p className="mt-0.5 text-xs text-slate-400">
            UK Culture Fit Interview Prep
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary Navigation">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-emerald-600/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-300 border border-transparent hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {item.meta && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? "text-emerald-300" : "text-slate-400"
                  }`}
                >
                  {item.meta}
                </span>
              )}
            </button>
          );
        })}

        {/* Core v1 Goal Progress Card */}
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Core v1 Milestone</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
              {readyCount}/10
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${milestonePct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {readyCount >= 10
              ? "Core milestone reached. Expand toward 30 stories for full depth."
              : `${10 - readyCount} more Ready ${
                  10 - readyCount === 1 ? "story" : "stories"
                } to reach core coverage.`}
          </p>
        </div>
      </nav>

      {/* Candidate Profile Footer */}
      <div className="border-t border-slate-800/80 p-4">
        {profile ? (
          <div className="space-y-2.5">
            <div>
              <p className="truncate text-sm font-semibold text-white">
                {profile.targetRole}
              </p>
              <p className="truncate text-xs text-slate-400">
                {profile.seniority} · {profile.sector}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Confidence
              </span>
              <span className="font-mono font-medium text-white tabular-nums">
                {profile.currentConfidence}/10
              </span>
            </div>
            <button
              type="button"
              onClick={onEditProfile}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEditProfile}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Set Up Profile
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] shrink-0">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
