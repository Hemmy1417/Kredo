"use client";

// Studionet has no on-chain clock. When we need to display "requested 2h ago"
// or "due in 28 days", we track the first time the browser observed each
// loan_id and persist that to localStorage. Anyone who watches from the same
// browser gets a consistent view; anyone else gets the sequence-order view.
// A footnote in the UI is honest about the caveat.

import { useEffect, useState } from "react";
import type { Loan } from "../contracts/types";

const KEY = "kredo_loan_timestamps_v1";

type Timestamps = Record<string, number>;

function read(): Timestamps {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map: Timestamps) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota / disabled — silent, timestamps just won't persist */
  }
}

/**
 * Record "first seen" moment for each loan the browser has ever observed.
 * Returns the map — components use it as a fallback origin for elapsed math.
 */
export function useLoanTimestamps(loans: Loan[] | undefined): Timestamps {
  const [map, setMap] = useState<Timestamps>(() => read());

  useEffect(() => {
    if (!loans?.length) return;
    let changed = false;
    const next = { ...map };
    const now = Date.now();
    for (const loan of loans) {
      if (!loan.loan_id) continue;
      if (!next[loan.loan_id]) {
        next[loan.loan_id] = now;
        changed = true;
      }
    }
    if (changed) {
      write(next);
      setMap(next);
    }
  }, [loans, map]);

  return map;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Return timing info for a loan. v0.4 loans carry a REAL on-chain maturity the
 * contract fetched from public clocks at origination (due_at_epoch), so we use
 * that — it's authoritative and identical for everyone. Only legacy loans (or
 * loans opened while the clock was unreachable, due_at_epoch === 0) fall back to
 * the browser's first-seen timestamp.
 *
 * `onChain` says which basis was used; `isOverduePastGrace` mirrors exactly the
 * predicate the contract uses to allow permissionless liquidation, so the UI
 * only offers that action when the chain would actually accept it.
 */
export function computeLoanClock(
  loan: Loan,
  timestamps: Timestamps,
): {
  createdAt: number | null;
  elapsedDays: number;
  remainingDays: number | null;
  dueAt: number | null;
  graceAt: number | null;
  onChain: boolean;
  isOverduePastGrace: boolean;
} {
  const now = Date.now();
  const dueEpoch = Number(loan.due_at_epoch ?? 0);

  // ── on-chain maturity (v0.4) — the trusted path ──────────────────────────
  if (dueEpoch > 0) {
    const disbursed = Number(loan.disbursed_at_epoch ?? 0);
    const graceEpoch = Number(loan.grace_until_epoch ?? dueEpoch);
    const createdAt = disbursed > 0 ? disbursed * 1000 : null;
    const dueAt = dueEpoch * 1000;
    const graceAt = graceEpoch * 1000;
    const remainingDays = (dueAt - now) / MS_PER_DAY;
    const elapsedDays = createdAt !== null ? Math.max(0, now - createdAt) / MS_PER_DAY : 0;
    return {
      createdAt,
      elapsedDays,
      remainingDays,
      dueAt,
      graceAt,
      onChain: true,
      isOverduePastGrace: now / 1000 > graceEpoch,
    };
  }

  // ── legacy fallback: browser-recorded first-seen timestamp ───────────────
  const createdAt = timestamps[loan.loan_id] ?? null;
  if (createdAt === null) {
    return {
      createdAt: null, elapsedDays: 0, remainingDays: null, dueAt: null,
      graceAt: null, onChain: false, isOverduePastGrace: false,
    };
  }
  const elapsedDays = Math.max(0, now - createdAt) / MS_PER_DAY;
  const duration = Number(loan.duration_days ?? 0);
  const dueAt = createdAt + duration * MS_PER_DAY;
  const remainingDays = (dueAt - now) / MS_PER_DAY;
  return {
    createdAt, elapsedDays, remainingDays, dueAt,
    graceAt: null, onChain: false, isOverduePastGrace: false,
  };
}

/**
 * A friendly "2 hours ago" / "3 days ago" formatter.
 */
export function timeAgo(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.max(0, (Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
