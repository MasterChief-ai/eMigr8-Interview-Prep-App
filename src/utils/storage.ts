import { PracticeSession, StorySlot, UserProfile } from "../types";
import { createInitialStoryBank } from "../data/themes";

const KEYS = {
  PROFILE: "emigr8_uk_prep_profile_v1",
  STORIES: "emigr8_uk_prep_stories_v1",
  PRACTICE: "emigr8_uk_prep_practice_v1",
} as const;

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function loadStories(): StorySlot[] {
  try {
    const raw = localStorage.getItem(KEYS.STORIES);
    if (!raw) {
      const seeded = createInitialStoryBank();
      saveStories(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as StorySlot[];
    if (!Array.isArray(parsed) || parsed.length !== 30) {
      const seeded = createInitialStoryBank();
      // Preserve any matching slots if partial data exists
      const byId = new Map(Array.isArray(parsed) ? parsed.map((s) => [s.id, s]) : []);
      const merged = seeded.map((slot) => byId.get(slot.id) ?? slot);
      saveStories(merged);
      return merged;
    }
    return parsed;
  } catch {
    const seeded = createInitialStoryBank();
    saveStories(seeded);
    return seeded;
  }
}

export function saveStories(stories: StorySlot[]): void {
  localStorage.setItem(KEYS.STORIES, JSON.stringify(stories));
}

export function loadPracticeSessions(): PracticeSession[] {
  try {
    const raw = localStorage.getItem(KEYS.PRACTICE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PracticeSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePracticeSessions(sessions: PracticeSession[]): void {
  localStorage.setItem(KEYS.PRACTICE, JSON.stringify(sessions));
}

export function resetAllData(): void {
  localStorage.removeItem(KEYS.PROFILE);
  localStorage.removeItem(KEYS.STORIES);
  localStorage.removeItem(KEYS.PRACTICE);
}

export function isDateOlderThanTwoYears(dateStr: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const trimmed = dateStr.trim();
  const parsed = /^\d{4}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}-01T00:00:00Z`)
    : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return false;

  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  return parsed < twoYearsAgo;
}

export function isValidProofUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
