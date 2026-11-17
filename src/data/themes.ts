import { BehavioralTheme, StorySlot } from "../types";

export const UK_BEHAVIORAL_THEMES: BehavioralTheme[] = [
  {
    id: "ownership-accountability",
    number: 1,
    name: "Ownership & Accountability",
    description: "Stepping up when things fall between gaps, owning mistakes without blame, and seeing outcomes through.",
    ukEmployerSignal: "UK teams value quiet reliability and taking personal responsibility rather than waiting to be told.",
  },
  {
    id: "navigating-ambiguity",
    number: 2,
    name: "Navigating Ambiguity",
    description: "Making structured progress when requirements, priorities, or data are incomplete or shifting.",
    ukEmployerSignal: "Demonstrates independent judgement without needing rigid micromanagement.",
  },
  {
    id: "stakeholder-conflict",
    number: 3,
    name: "Stakeholder Conflict & Pushback",
    description: "Disagreeing respectfully with senior colleagues, product owners, or clients using evidence and tact.",
    ukEmployerSignal: "UK workplace culture prizes diplomatic candour—challenging ideas constructively without ego.",
  },
  {
    id: "delivering-under-pressure",
    number: 4,
    name: "Delivering Under Pressure",
    description: "Managing tight deadlines, production incidents, or competing priorities with calm triage.",
    ukEmployerSignal: "Shows composure, realistic expectation-setting, and transparent risk escalation.",
  },
  {
    id: "cross-functional-collaboration",
    number: 5,
    name: "Cross-Functional Collaboration",
    description: "Partnering across engineering, design, ops, compliance, or commercial teams to ship shared goals.",
    ukEmployerSignal: "Tests how well you translate your work for non-specialists and align diverse incentives.",
  },
  {
    id: "failure-learning",
    number: 6,
    name: "Failure & Learning",
    description: "A genuine mistake or missed target, what you owned immediately, and what system or habit changed.",
    ukEmployerSignal: "UK panels distrust 'humblebrags'—they look for honest reflection and preventative action.",
  },
  {
    id: "customer-user-focus",
    number: 7,
    name: "Customer / User Focus",
    description: "Understanding end-user pain points and making practical decisions that improved their real experience.",
    ukEmployerSignal: "Connects technical or operational execution back to tangible human or commercial value.",
  },
  {
    id: "problem-solving-tradeoffs",
    number: 8,
    name: "Problem Solving & Trade-offs",
    description: "Weighing imperfect options (speed vs. quality, cost vs. scope) and defending the rationale clearly.",
    ukEmployerSignal: "Shows pragmatic commercial awareness rather than dogmatic perfectionism.",
  },
  {
    id: "adaptability-change",
    number: 9,
    name: "Adaptability & Change",
    description: "Adjusting quickly to reorganisations, new tooling, shifting regulations, or unfamiliar environments.",
    ukEmployerSignal: "Especially relevant for international talent adapting smoothly to new standards and norms.",
  },
  {
    id: "leadership-mentoring",
    number: 10,
    name: "Leadership & Mentoring (without authority)",
    description: "Raising standards, unblocking peers, or guiding juniors through influence rather than formal rank.",
    ukEmployerSignal: "Signals collaborative senior potential regardless of your job title.",
  },
];

export function createInitialStoryBank(): StorySlot[] {
  const slots: StorySlot[] = [];
  const now = new Date().toISOString();

  for (const theme of UK_BEHAVIORAL_THEMES) {
    for (const slotIndex of [1, 2, 3] as const) {
      slots.push({
        id: `${theme.id}-slot-${slotIndex}`,
        themeId: theme.id,
        slotIndex,
        oneLineSummary: "",
        dateOccurred: "",
        situation: "",
        task: "",
        action: "",
        result: "",
        proofUrl: "",
        proofStatus: "Unverified",
        readiness: null,
        status: "EMPTY",
        practiceUseCount: 0,
        coachMessages: [],
        updatedAt: now,
      });
    }
  }

  return slots;
}
