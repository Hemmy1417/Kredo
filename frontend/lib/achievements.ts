// Pure functions — no state, no hooks. Feed in reputation + events + loans,
// get back the list of achievements the wallet has unlocked. Rendered as
// small badges in YourScoreCard.

import type { Loan, ReputationProfile } from "./contracts/types";
import type { ScoreEvent } from "./hooks/useScoreEvents";

export type Achievement = {
  id: string;
  label: string;
  hint: string;                       // shown on hover / below the badge
  earned: boolean;
  icon?: string;                      // Lucide icon name — component picks it up
};

export function computeAchievements(args: {
  reputation: ReputationProfile | null;
  events: ScoreEvent[];
  loans: Loan[];                      // loans OF this wallet only
}): Achievement[] {
  const { reputation, events, loans } = args;
  const score = reputation?.score ?? 0;
  const verified = !!reputation?.verified;
  const repaid = loans.filter((l) => l.status === "REPAID").length;
  const defaulted = loans.filter((l) => l.status === "LIQUIDATED").length;

  // Longest streak of on-time repayments — walk chronological events.
  const chrono = [...events].sort((a, b) => a.at - b.at);
  let cur = 0;
  let best = 0;
  for (const e of chrono) {
    if (e.kind === "loan_repaid") { cur += 1; best = Math.max(best, cur); }
    else if (e.kind === "loan_defaulted") { cur = 0; }
  }

  const achievements: Achievement[] = [
    { id: "first_verify",  label: "First verification", hint: "Verified your identity for the first time",             icon: "ShieldCheck",  earned: verified },
    { id: "first_loan",    label: "First loan",         hint: "Opened your first Kredo loan",                          icon: "Landmark",     earned: loans.length >= 1 },
    { id: "first_repay",   label: "First repayment",    hint: "Repaid a loan on time",                                 icon: "CheckCircle2", earned: repaid >= 1 },
    { id: "tier_good",     label: "Good tier",          hint: "Reached score 50 — 110% collateral unlocked",           icon: "Star",         earned: score >= 50 },
    { id: "tier_trusted",  label: "Trusted tier",       hint: "Reached score 75 — 90% collateral unlocked",            icon: "Award",        earned: score >= 75 },
    { id: "tier_elite",    label: "Elite tier",         hint: "Reached score 90 — 70% collateral unlocked",            icon: "Trophy",       earned: score >= 90 },
    { id: "streak_3",      label: "3-in-a-row",         hint: "Three repayments in a row without a default",           icon: "Flame",        earned: best >= 3 },
    { id: "streak_5",      label: "5-in-a-row",         hint: "Five repayments in a row without a default",            icon: "Flame",        earned: best >= 5 },
    { id: "veteran_10",    label: "Veteran",            hint: "Ten total repayments on record",                        icon: "Crown",        earned: repaid >= 10 },
    { id: "clean_slate",   label: "Spotless",           hint: "Three or more repayments, zero defaults",               icon: "Sparkles",     earned: repaid >= 3 && defaulted === 0 },
  ];

  return achievements;
}

/**
 * Tier progress — how many points until the next collateral tier.
 * Used by the progress bar in YourScoreCard.
 */
export function tierProgress(score: number): {
  currentTier: string;
  nextTier: string | null;
  pointsToNext: number;
  saving: string;
} {
  if (score >= 90) return { currentTier: "Elite",    nextTier: null,        pointsToNext: 0,        saving: "You are at the top tier — 70% collateral." };
  if (score >= 75) return { currentTier: "Trusted",  nextTier: "Elite",     pointsToNext: 90 - score, saving: "20% collateral savings unlocks at Elite." };
  if (score >= 50) return { currentTier: "Good",     nextTier: "Trusted",   pointsToNext: 75 - score, saving: "20% collateral savings unlocks at Trusted." };
  if (score >= 25) return { currentTier: "Low-Med",  nextTier: "Good",      pointsToNext: 50 - score, saving: "20% collateral savings unlocks at Good." };
  return              { currentTier: "Standard", nextTier: "Low-Med",   pointsToNext: 25 - score, saving: "20% collateral savings unlocks at Low-Med." };
}
