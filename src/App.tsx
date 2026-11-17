import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { UK_BEHAVIORAL_THEMES, createInitialStoryBank } from "./data/themes";
import { ActiveView, PracticeSession, StorySlot, UserProfile } from "./types";
import {
  loadPracticeSessions,
  loadProfile,
  loadStories,
  resetAllData,
  savePracticeSessions,
  saveProfile,
  saveStories,
} from "./utils/storage";
import { Sidebar } from "./components/Sidebar";
import { OnboardingModal } from "./components/OnboardingModal";
import { DashboardView } from "./components/DashboardView";
import { StoryBuilderView } from "./components/StoryBuilderView";
import { PracticeSimulatorView } from "./components/PracticeSimulatorView";
import { PracticeHistoryView } from "./components/PracticeHistoryView";

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [stories, setStories] = useState<StorySlot[]>(() => loadStories());
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>(() =>
    loadPracticeSessions()
  );

  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [activeStoryId, setActiveStoryId] = useState<string>(
    () => stories[0]?.id ?? "ownership-accountability-slot-1"
  );
  const [practiceThemeId, setPracticeThemeId] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    saveStories(stories);
  }, [stories]);

  useEffect(() => {
    savePracticeSessions(practiceSessions);
  }, [practiceSessions]);

  const handleSaveProfile = (nextProfile: UserProfile) => {
    saveProfile(nextProfile);
    setProfile(nextProfile);
    setEditProfileOpen(false);
  };

  const handleResetAll = () => {
    resetAllData();
    const freshStories = createInitialStoryBank();
    setProfile(null);
    setStories(freshStories);
    setPracticeSessions([]);
    setActiveStoryId(freshStories[0].id);
    setActiveView("dashboard");
    setEditProfileOpen(false);
  };

  const handleUpdateStory = (
    storyId: string,
    updater: (prev: StorySlot) => StorySlot
  ) => {
    setStories((prev) =>
      prev.map((slot) => (slot.id === storyId ? updater(slot) : slot))
    );
  };

  const handleOpenStory = (storyId: string) => {
    setActiveStoryId(storyId);
    setActiveView("builder");
  };

  const handleStartPractice = (themeId?: string) => {
    setPracticeThemeId(themeId ?? null);
    setActiveView("practice");
  };

  const handleCompletePracticeSession = (session: PracticeSession) => {
    setPracticeSessions((prev) => [session, ...prev]);
    if (session.usedStoryId) {
      handleUpdateStory(session.usedStoryId, (prev) => ({
        ...prev,
        practiceUseCount: prev.practiceUseCount + 1,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handleUpdateConfidence = (newConfidence: number) => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      currentConfidence: newConfidence,
      confidenceUpdatedAtSession: practiceSessions.length,
    };
    saveProfile(updated);
    setProfile(updated);
  };

  const readyCount = stories.filter((s) => s.status === "READY").length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        profile={profile}
        readyCount={readyCount}
        practiceCount={practiceSessions.length}
        onEditProfile={() => setEditProfileOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-base font-bold text-slate-900 whitespace-nowrap">
              eMigr8 Culture Fit Prep
            </span>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
            {readyCount}/10 Ready
          </span>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {activeView === "dashboard" && (
            <DashboardView
              profile={profile}
              themes={UK_BEHAVIORAL_THEMES}
              stories={stories}
              practiceSessions={practiceSessions}
              onOpenStory={handleOpenStory}
              onStartPractice={handleStartPractice}
            />
          )}

          {activeView === "builder" && (
            <StoryBuilderView
              profile={profile}
              themes={UK_BEHAVIORAL_THEMES}
              stories={stories}
              activeStoryId={activeStoryId}
              onSelectStory={(id) => setActiveStoryId(id)}
              onUpdateStory={handleUpdateStory}
              onBackToBank={() => setActiveView("dashboard")}
            />
          )}

          {activeView === "practice" && (
            <PracticeSimulatorView
              profile={profile}
              themes={UK_BEHAVIORAL_THEMES}
              stories={stories}
              practiceSessions={practiceSessions}
              initialThemeId={practiceThemeId}
              onCompleteSession={handleCompletePracticeSession}
              onUpdateConfidence={handleUpdateConfidence}
              onOpenStory={handleOpenStory}
            />
          )}

          {activeView === "history" && (
            <PracticeHistoryView
              sessions={practiceSessions}
              stories={stories}
              onGoToPractice={() => setActiveView("practice")}
            />
          )}
        </main>

        {/* Subtle Guardrail Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-3.5 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            Interview preparation tool only. Does not constitute UK immigration or legal advice and does not guarantee job or visa outcomes.
          </p>
        </footer>
      </div>

      {/* Onboarding / Profile Modal */}
      <OnboardingModal
        key={editProfileOpen ? "edit" : profile ? "done" : "onboard"}
        isOpen={!profile || editProfileOpen}
        existingProfile={profile}
        onSave={handleSaveProfile}
        onClose={profile ? () => setEditProfileOpen(false) : undefined}
        onResetAll={profile ? handleResetAll : undefined}
      />
    </div>
  );
}
