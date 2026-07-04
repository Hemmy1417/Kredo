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
 * Return { elapsedDays, remainingDays, dueAt } for a loan, based on the
 * browser-recorded first-seen timestamp. If the browser has never seen this
 * loan (i.e. someone else took it), returns nulls.
 */
export function computeLoanClock(
  loan: Loan,
  timestamps: Timestamps,
): {
  createdAt: number | null;
  elapsedDays: number;
  remainingDays: number | null;
  dueAt: number | null;
} {
  const createdAt = timestamps[loan.loan_id] ?? null;
  if (createdAt === null) {
    return { createdAt: null, elapsedDays: 0, remainingDays: null, dueAt: null };
  }
  const now = Date.now();
  const elapsedMs = Math.max(0, now - createdAt);
  const elapsedDays = elapsedMs / MS_PER_DAY;
  const duration = Number(loan.duration_days ?? 0);
  const dueAt = createdAt + duration * MS_PER_DAY;
  const remainingDays = (dueAt - now) / MS_PER_DAY;
  return { createdAt, elapsedDays, remainingDays, dueAt };
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
