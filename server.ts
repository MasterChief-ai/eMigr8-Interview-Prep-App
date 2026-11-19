import dotenv from "dotenv";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}
dotenv.config();

const PORT = 3000;
const MODEL_NAME = "gemini-4-hydrogen";

class MissingApiKeyError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in the Settings > Secrets panel and restart the server."
    );
    this.name = "MissingApiKeyError";
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function sendRouteError(res: Response, route: string, error: unknown, fallback: string) {
  if (error instanceof MissingApiKeyError) {
    res.status(503).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : fallback;
  console.error(`[${route}] error:`, error);
  res.status(500).json({ error: message });
}

function isWithinTwoYears(dateStr: string): { valid: boolean; recent: boolean; reason?: string } {
  if (!dateStr || !dateStr.trim()) {
    return { valid: false, recent: false, reason: "No date has been entered yet." };
  }
  const trimmed = dateStr.trim();
  const parsed = /^\d{4}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}-01T00:00:00Z`)
    : new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, recent: false, reason: "Date format could not be parsed." };
  }

  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  // Allow current month / small timezone margin up to 7 days in the future
  const maxFuture = new Date(now);
  maxFuture.setDate(now.getDate() + 7);

  if (parsed > maxFuture) {
    return { valid: true, recent: false, reason: "Date is in the future." };
  }
  if (parsed < twoYearsAgo) {
    return {
      valid: true,
      recent: false,
      reason: "This example is over 2 years old. UK panels strongly prefer examples from the past 24 months.",
    };
  }
  return { valid: true, recent: true };
}

interface CoachMessageInput {
  role: "user" | "assistant";
  text: string;
}

interface ProfileInput {
  targetRole?: string;
  sector?: string;
  seniority?: string;
}

interface StoryInput {
  oneLineSummary?: string;
  dateOccurred?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  proofUrl?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // 1. AI Extraction Coach endpoint
  app.post("/api/coach", async (req: Request, res: Response) => {
    try {
      const { profile, theme, story, messages } = req.body as {
        profile?: ProfileInput;
        theme?: { name: string; description: string };
        story?: StoryInput;
        messages?: CoachMessageInput[];
      };

      const ai = getGeminiClient();

      const systemInstruction = `You are a practical, candid UK Behavioral Interview Extraction Coach helping a UK Skilled Worker visa applicant uncover real, truthful STAR stories (Situation, Task, Action, Result) from their work, university study, volunteering, or side projects.

STRICT RULES — NEVER VIOLATE THESE:
1. NEVER invent, embellish, exaggerate, or ghostwrite achievements, numbers, or outcomes. Only reflect facts the candidate has explicitly given you.
2. NEVER use corporate fluff, cliches, or buzzwords (avoid "spearheaded", "synergized", "leveraged", "transformative", "impactful"). Use plain, natural British/international English.
3. If the candidate uses "we", "our team", or passive voice ("it was decided"), immediately ask what THEY personally decided, built, pushed back on, or executed.
4. Always probe for:
   - Exact timeframe (Month & Year) so they meet the 2-year recency bar.
   - Concrete, verifiable results (time saved, bug rate, revenue, customer outcome, project milestone).
   - Plain-English explanations of any technical jargon, acronyms, or domain terms so an HR interviewer or cross-functional UK panel understands why it mattered.
5. Keep each response crisp and focused: 2–3 short sentences of observation followed by 1–2 pointed questions. Help them clarify their own words so they can type them into their STAR card on the right.`;

      const currentDateISO = new Date().toISOString().slice(0, 10);
      const storySnapshot = [
        `Target Role: ${profile?.targetRole || "Not set"} | Sector: ${profile?.sector || "Not set"} | Seniority: ${profile?.seniority || "Not set"}`,
        `Behavioral Theme: ${theme?.name || "General"} — ${theme?.description || ""}`,
        `Today's Date: ${currentDateISO}`,
        `Current STAR Draft:`,
        `- One-Line Summary: ${story?.oneLineSummary || "(empty)"}`,
        `- Date Occurred: ${story?.dateOccurred || "(empty)"}`,
        `- Situation: ${story?.situation || "(empty)"}`,
        `- Task: ${story?.task || "(empty)"}`,
        `- Action: ${story?.action || "(empty)"}`,
        `- Result: ${story?.result || "(empty)"}`,
        `- Proof URL: ${story?.proofUrl || "(none)"}`,
      ].join("\n");

      const transcript = (messages || [])
        .map((m) => `${m.role === "user" ? "Candidate" : "Coach"}: ${m.text}`)
        .join("\n\n");

      const prompt = transcript
        ? `${storySnapshot}\n\nConversation so far:\n${transcript}\n\nRespond as the Coach to the candidate's latest message.`
        : `${storySnapshot}\n\nThe candidate just opened this story slot. Greet them briefly and ask 1–2 targeted questions to help them recall a real experience (work, study, volunteering, or side project) that fits "${theme?.name || "this theme"}".`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: "Empty response received from Gemini." });
        return;
      }

      res.json({ reply });
    } catch (error) {
      sendRouteError(res, "/api/coach", error, "Failed to generate coaching response.");
    }
  });

  // 2. Readiness Gatekeeper endpoint (Structured JSON Schema)
  app.post("/api/readiness-check", async (req: Request, res: Response) => {
    try {
      const { profile, theme, story } = req.body as {
        profile?: ProfileInput;
        theme?: { name: string; description: string };
        story?: StoryInput;
      };

      const ai = getGeminiClient();
      const todayISO = new Date().toISOString().slice(0, 10);
      const dateCheck = isWithinTwoYears(story?.dateOccurred || "");

      const systemInstruction = `You are a strict UK Behavioral Interview Readiness Gatekeeper.
Evaluate whether a candidate's drafted STAR story passes 4 mandatory criteria for a UK Skilled Worker interview panel.
Be rigorous, honest, and specific. Do NOT pass vague, team-only ("we"), unquantified, outdated, or jargon-heavy stories.
Do NOT invent facts—tell the user precisely what is missing or unclear in their own draft.`;

      const prompt = `Evaluate this STAR story for the theme "${theme?.name || "Behavioral Theme"}" (${theme?.description || ""}).
Candidate Context: Role=${profile?.targetRole || "Applicant"}, Sector=${profile?.sector || "General"}, Seniority=${profile?.seniority || "Mid-Level"}.
Today's Date: ${todayISO}.

STORY FIELDS:
- One-Line Summary: ${story?.oneLineSummary?.trim() || "(EMPTY)"}
- Date Occurred: ${story?.dateOccurred?.trim() || "(EMPTY)"}
- Situation: ${story?.situation?.trim() || "(EMPTY)"}
- Task: ${story?.task?.trim() || "(EMPTY)"}
- Action: ${story?.action?.trim() || "(EMPTY)"}
- Result: ${story?.result?.trim() || "(EMPTY)"}

EVALUATION CRITERIA:
1. hasSpecificResult: True ONLY if the Result field states a concrete, verifiable outcome (numbers, time/cost saved, error reduction, shipped deliverable, user/stakeholder impact). Vague statements like "it went well" or empty text MUST be false.
2. clearPersonalOwnership: True ONLY if the Action field clearly specifies what the candidate PERSONALLY did using "I" statements (decisions, actions, trade-offs). If it relies on "we" or vague team effort, or is empty, MUST be false.
3. isRecent: True ONLY if Date Occurred is provided and within 2 years of ${todayISO}. (Deterministic date check: valid=${dateCheck.valid}, within2Years=${dateCheck.recent}).
4. jargonExplained: True ONLY if technical tools, acronyms, or niche domain terms across Situation/Task/Action/Result are either absent or clearly explained in plain English so a non-specialist UK hiring manager or HR interviewer understands the context and impact. If fields are empty, MUST be false.

For any criterion that is false, provide a concise, actionable item in fixPrompts.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasSpecificResult: {
                type: Type.BOOLEAN,
                description: "Whether the Result includes concrete metrics or verifiable outcomes.",
              },
              clearPersonalOwnership: {
                type: Type.BOOLEAN,
                description: "Whether the Action clearly highlights personal 'I' ownership rather than 'we'.",
              },
              isRecent: {
                type: Type.BOOLEAN,
                description: "Whether Date Occurred is present and within the last 2 years.",
              },
              jargonExplained: {
                type: Type.BOOLEAN,
                description: "Whether technical or domain jargon is explained in plain English.",
              },
              fixPrompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    criterion: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["criterion", "issue", "suggestion"],
                },
                description: "Specific fixes needed for any failed criteria.",
              },
              overallVerdict: {
                type: Type.STRING,
                description: "One-sentence candid verdict on readiness.",
              },
            },
            required: [
              "hasSpecificResult",
              "clearPersonalOwnership",
              "isRecent",
              "jargonExplained",
              "fixPrompts",
              "overallVerdict",
            ],
          },
        },
      });

      const raw = (response.text ?? "{}").trim();
      const parsed = JSON.parse(raw) as {
        hasSpecificResult: boolean;
        clearPersonalOwnership: boolean;
        isRecent: boolean;
        jargonExplained: boolean;
        fixPrompts: Array<{ criterion: string; issue: string; suggestion: string }>;
        overallVerdict: string;
      };

      // Enforce deterministic safeguards alongside Gemini assessment
      const fixPrompts = Array.isArray(parsed.fixPrompts) ? [...parsed.fixPrompts] : [];
      let hasSpecificResult = Boolean(parsed.hasSpecificResult);
      let clearPersonalOwnership = Boolean(parsed.clearPersonalOwnership);
      let isRecent = Boolean(parsed.isRecent) && dateCheck.recent;
      let jargonExplained = Boolean(parsed.jargonExplained);

      if (!dateCheck.recent) {
        isRecent = false;
        const alreadyMentioned = fixPrompts.some((f) =>
          f.criterion.toLowerCase().includes("recent") || f.criterion.toLowerCase().includes("date")
        );
        if (!alreadyMentioned) {
          fixPrompts.push({
            criterion: "Recent (Within 2 Years)",
            issue: dateCheck.reason || "Date is missing or older than 2 years.",
            suggestion: "Enter a YYYY-MM date within the past 24 months, or choose a more recent example.",
          });
        }
      }

      if (!story?.result || story.result.trim().length < 10) {
        hasSpecificResult = false;
      }
      if (!story?.action || story.action.trim().length < 15) {
        clearPersonalOwnership = false;
      }
      if (!story?.situation?.trim() || !story?.task?.trim()) {
        jargonExplained = false;
      }

      const allPassed = hasSpecificResult && clearPersonalOwnership && isRecent && jargonExplained;

      res.json({
        hasSpecificResult,
        clearPersonalOwnership,
        isRecent,
        jargonExplained,
        fixPrompts: allPassed ? [] : fixPrompts,
        overallVerdict: allPassed
          ? "All 4 UK interview readiness criteria passed. This story is ready for practice."
          : parsed.overallVerdict || "Address the flagged items below before marking this story Ready.",
      });
    } catch (error) {
      sendRouteError(res, "/api/readiness-check", error, "Failed to run readiness check.");
    }
  });

  // 3. Practice Simulator: Generate UK Hiring Manager Question
  app.post("/api/practice/question", async (req: Request, res: Response) => {
    try {
      const { profile, theme, previousQuestions } = req.body as {
        profile?: ProfileInput;
        theme?: { name: string; description: string };
        previousQuestions?: string[];
      };

      const ai = getGeminiClient();

      const prompt = `You are a UK Hiring Manager conducting a structured behavioral / culture-fit interview for a Skilled Worker visa candidate.
Candidate Target Role: ${profile?.targetRole || "Software Engineer"}
Sector: ${profile?.sector || "Technology"}
Seniority: ${profile?.seniority || "Mid-Level"}
Target Behavioral Theme: ${theme?.name || "Ownership & Accountability"} (${theme?.description || ""})
${previousQuestions && previousQuestions.length > 0 ? `Avoid repeating these recent questions:\n- ${previousQuestions.join("\n- ")}` : ""}

Ask ONE realistic, natural-sounding UK behavioral interview question (e.g. "Tell me about a time when..." or "Can you walk me through a situation where...") tailored to their role, sector, and seniority. Avoid American buzzwords or artificial corporate jargon.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The realistic UK Hiring Manager behavioral question.",
              },
              interviewerContext: {
                type: Type.STRING,
                description: "Brief 1-sentence note on who is asking (e.g. Engineering Manager at a UK FinTech).",
              },
              whatUkPanelLooksFor: {
                type: Type.STRING,
                description: "1-2 sentences on what UK employers specifically assess in this competency.",
              },
            },
            required: ["question", "interviewerContext", "whatUkPanelLooksFor"],
          },
        },
      });

      const raw = (response.text ?? "{}").trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (error) {
      sendRouteError(res, "/api/practice/question", error, "Failed to generate practice question.");
    }
  });

  // 4. Practice Simulator: Grade Candidate Answer as UK Hiring Manager
  app.post("/api/practice/evaluate", async (req: Request, res: Response) => {
    try {
      const { profile, theme, question, answer } = req.body as {
        profile?: ProfileInput;
        theme?: { name: string; description: string };
        question?: string;
        answer?: string;
      };

      if (!answer || answer.trim().length < 20) {
        res.status(400).json({ error: "Please provide a fuller response (at least 20 characters) for evaluation." });
        return;
      }

      const ai = getGeminiClient();
      const wordCount = answer.trim().split(/\s+/).length;

      const systemInstruction = `You are a candid, fair, experienced UK Hiring Manager evaluating a Skilled Worker visa applicant's behavioral interview answer.
Give grounded, constructive, realistic UK interview feedback. Do NOT flatter weak answers, and do NOT invent facts they didn't say.
Pay close attention to:
- STAR Structure (1–5): Did they balance Situation/Task briefly (~20%) and spend most time on personal Action (~60%) and measurable Result (~20%)?
- Specificity: Did they say "I" instead of hiding behind "we"? Did they include concrete numbers, dates, or verifiable outcomes?
- Conciseness & Length: Word count is ${wordCount} words (~${Math.round((wordCount / 130) * 60)} seconds spoken at 130 wpm; ideal UK behavioral answer is 200–350 words / ~2–2.5 minutes). Point out explicitly where they rambled, over-explained background context, or cut off the Result too fast.`;

      const prompt = `Candidate: ${profile?.targetRole || "Applicant"} (${profile?.seniority || "Mid-Level"}, ${profile?.sector || "Tech"})
Theme: ${theme?.name || "Behavioral Competency"}
Question Asked: "${question}"
Candidate's Written Answer (${wordCount} words):
"""
${answer}
"""

Evaluate this response honestly and constructively.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              starStructureScore: {
                type: Type.INTEGER,
                description: "Score from 1 (poor) to 5 (interview-ready STAR balance).",
              },
              specificityFeedback: {
                type: Type.STRING,
                description: "Critique on metrics, personal ownership ('I' vs 'we'), and concrete evidence.",
              },
              concisenessFeedback: {
                type: Type.STRING,
                description: "Critique on length, pacing, rambling, or missing sections.",
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 3 concrete strengths in the candidate's answer.",
              },
              improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 3 specific, actionable improvements.",
              },
              followUpQuestion: {
                type: Type.STRING,
                description: "One realistic follow-up probing question a UK hiring manager would ask next.",
              },
              matchedThemeAlignment: {
                type: Type.STRING,
                description: "Short assessment of how well the answer addresses the target theme.",
              },
            },
            required: [
              "starStructureScore",
              "specificityFeedback",
              "concisenessFeedback",
              "strengths",
              "improvements",
              "followUpQuestion",
              "matchedThemeAlignment",
            ],
          },
        },
      });

      const raw = (response.text ?? "{}").trim();
      const parsed = JSON.parse(raw);
      parsed.starStructureScore = Math.max(1, Math.min(5, Math.round(Number(parsed.starStructureScore) || 1)));
      res.json(parsed);
    } catch (error) {
      sendRouteError(res, "/api/practice/evaluate", error, "Failed to evaluate practice response.");
    }
  });

  // Never let /api/* requests fall through to Vite or static HTML SPA fallback
  app.all("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  // Return JSON instead of Express default HTML error page on API middleware errors (e.g. malformed JSON)
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/")) {
      const message = err instanceof Error ? err.message : "Invalid API request.";
      res.status(400).json({ error: message });
      return;
    }
    next(err);
  });

  // Vite middleware in development; static dist/ in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`eMigr8 Culture Fit Interview Prep server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
