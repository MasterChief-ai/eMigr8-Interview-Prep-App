import React, { useState } from "react";
import { ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { SeniorityLevel, UserProfile } from "../types";

interface OnboardingModalProps {
  isOpen: boolean;
  existingProfile: UserProfile | null;
  onSave: (profile: UserProfile) => void;
  onClose?: () => void;
  onResetAll?: () => void;
}

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Data Analyst",
  "Product Manager",
  "DevOps / Cloud Engineer",
  "UX / Product Designer",
  "Business Analyst",
];

const SECTORS = [
  "Technology & SaaS",
  "FinTech & Financial Services",
  "Healthcare & Life Sciences",
  "E-Commerce & Retail",
  "Consulting & Professional Services",
  "Engineering, Energy & Manufacturing",
  "Public Sector & GovTech",
  "Education & EdTech",
  "Other",
];

const SENIORITY_LEVELS: SeniorityLevel[] = [
  "Junior / Graduate",
  "Mid-Level",
  "Senior",
  "Lead / Principal",
  "Manager / Director",
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  existingProfile,
  onSave,
  onClose,
  onResetAll,
}) => {
  const [targetRole, setTargetRole] = useState(existingProfile?.targetRole ?? "");
  const [sector, setSector] = useState(existingProfile?.sector ?? "Technology & SaaS");
  const [seniority, setSeniority] = useState<SeniorityLevel>(
    existingProfile?.seniority ?? "Mid-Level"
  );
  const [confidence, setConfidence] = useState<number>(
    existingProfile?.currentConfidence ?? 5
  );
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const isEditing = Boolean(existingProfile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError("Please enter your target UK role (e.g. Software Engineer).");
      return;
    }

    const now = new Date().toISOString();
    const profile: UserProfile = existingProfile
      ? {
          ...existingProfile,
          targetRole: targetRole.trim(),
          sector,
          seniority,
          currentConfidence: confidence,
        }
      : {
          targetRole: targetRole.trim(),
          sector,
          seniority,
          initialConfidence: confidence,
          currentConfidence: confidence,
          confidenceUpdatedAtSession: null,
          createdAt: now,
        };

    onSave(profile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-medium text-emerald-700">
              eMigr8 Culture Fit Interview Prep
            </p>
            <h2
              id="onboarding-title"
              className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
            >
              {isEditing ? "Update Target Profile" : "Set Up Your UK Interview Baseline"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Tailors AI extraction questions and UK Hiring Manager simulations to your role.
            </p>
          </div>
          {isEditing && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="target-role" className="block text-sm font-medium text-slate-800">
              Target UK Role
            </label>
            <input
              id="target-role"
              type="text"
              value={targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Software Engineer, Data Analyst, Product Manager"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLE_SUGGESTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setTargetRole(role);
                    if (error) setError("");
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    targetRole === role
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="target-sector" className="block text-sm font-medium text-slate-800">
                Target Sector
              </label>
              <select
                id="target-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                {SECTORS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="seniority-level" className="block text-sm font-medium text-slate-800">
                Seniority Level
              </label>
              <select
                id="seniority-level"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                {SENIORITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="confidence-slider"
                className="flex items-center gap-2 text-sm font-medium text-slate-800"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                {isEditing ? "Current Interview Confidence" : "Initial Interview Confidence"}
              </label>
              <span className="font-mono text-base font-semibold text-emerald-700 tabular-nums">
                {confidence} / 10
              </span>
            </div>
            <input
              id="confidence-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-3 w-full accent-emerald-600 cursor-pointer"
            />
            <div className="mt-1.5 flex justify-between text-xs text-slate-500">
              <span>1 · Unprepared</span>
              <span>5 · Moderate</span>
              <span>10 · Interview Ready</span>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Saved locally in your browser.</span>
            </div>

            <div className="flex items-center gap-3">
              {isEditing && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                {isEditing ? "Save Changes" : "Start Building Stories"}
              </button>
            </div>
          </div>

          {isEditing && onResetAll && (
            <div className="border-t border-slate-200 pt-4">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                >
                  Reset all saved stories and practice logs
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                  <span className="text-xs font-medium text-red-800">
                    Erase all 30 story slots, profile, and practice logs?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Keep Data
                    </button>
                    <button
                      type="button"
                      onClick={onResetAll}
                      className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
