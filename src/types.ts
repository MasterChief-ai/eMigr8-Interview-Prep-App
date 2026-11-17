export type SeniorityLevel =
  | "Junior / Graduate"
  | "Mid-Level"
  | "Senior"
  | "Lead / Principal"
  | "Manager / Director";

export interface UserProfile {
  targetRole: string;
  sector: string;
  seniority: SeniorityLevel;
  initialConfidence: number;
  currentConfidence: number;
  confidenceUpdatedAtSession: number | null;
  createdAt: string;
}

export interface BehavioralTheme {
  id: string;
  number: number;
  name: string;
  description: string;
  ukEmployerSignal: string;
}

export type ProofStatus = "Unverified" | "Link Added" | "Guided Draft";
export type StoryStatus = "EMPTY" | "DRAFT" | "READY";

export interface FixPrompt {
  criterion: string;
  issue: string;
  suggestion: string;
}

export interface ReadinessEvaluation {
  checkedAt: string;
  hasSpecificResult: boolean;
  clearPersonalOwnership: boolean;
  isRecent: boolean;
  jargonExplained: boolean;
  fixPrompts: FixPrompt[];
  overallVerdict: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface StorySlot {
  id: string;
  themeId: string;
  slotIndex: 1 | 2 | 3;
  oneLineSummary: string;
  dateOccurred: string; // YYYY-MM
  situation: string;
  task: string;
  action: string;
  result: string;
  proofUrl: string;
  proofStatus: ProofStatus;
  readiness: ReadinessEvaluation | null;
  status: StoryStatus;
  practiceUseCount: number;
  coachMessages: CoachMessage[];
  updatedAt: string;
}

export interface PracticeEvaluation {
  starStructureScore: number;
  specificityFeedback: string;
  concisenessFeedback: string;
  strengths: string[];
  improvements: string[];
  followUpQuestion: string;
  matchedThemeAlignment: string;
}

export interface PracticeSession {
  id: string;
  themeId: string;
  themeName: string;
  question: string;
  interviewerContext: string;
  answer: string;
  wordCount: number;
  usedStoryId: string | null;
  evaluation: PracticeEvaluation;
  createdAt: string;
}

export type ActiveView = "dashboard" | "builder" | "practice" | "history";
