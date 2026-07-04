"use client";

// A client-side changelog of everything that moved a wallet's reputation.
// Studionet has no wall-clock and the contract doesn't emit events, so we
// stitch this from what the user does in-browser plus what we can infer
// from the current on-chain state. Enough for the UI story; production
// would sink these to a subgraph.

import { useCallback, useEffect, useState } from "react";

export type ScoreEvent = {
  id: string;
  at: number;                         // ms since epoch
  kind: "verified" | "reverified" | "loan_repaid" | "loan_defaulted" | "loan_requested";
  delta: number;                      // +5, -20, 0…
  fromScore: number;
  toScore: number;
  note: string;                       // human-readable summary
  aiSummary?: string;                 // populated only for verify events
  aiRiskTier?: string;
  loanId?: string;
};

const KEY = (address: string) => `kredo_score_events_${address.toLowerCase()}`;

function read(address: string | null): ScoreEvent[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    const raw = localStorage.getItem(KEY(address));
    return raw ? (JSON.parse(raw) as ScoreEvent[]) : [];
  } catch {
    return [];
  }
}

function write(address: string, events: ScoreEvent[]) {
  if (typeof window === "undefined") return;
  try {
    // Cap at 100 most-recent events to keep localStorage sane.
    localStorage.setItem(KEY(address), JSON.stringify(events.slice(-100)));
  } catch { /* quota — silent */ }
}

export function useScoreEvents(address: string | null) {
  const [events, setEvents] = useState<ScoreEvent[]>(() => read(address));

  useEffect(() => {
    setEvents(read(address));
  }, [address]);

  const recordEvent = useCallback((e: Omit<ScoreEvent, "id" | "at">) => {
    if (!address) return;
    const next: ScoreEvent = { ...e, id: crypto.randomUUID(), at: Date.now() };
    const list = [...read(address), next];
    write(address, list);
    setEvents(list);
  }, [address]);

  const clear = useCallback(() => {
    if (!address) return;
    localStorage.removeItem(KEY(address));
    setEvents([]);
  }, [address]);

  return { events, recordEvent, clear };
}
