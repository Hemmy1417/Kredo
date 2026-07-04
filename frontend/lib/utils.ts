import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── GEN unit helpers ────────────────────────────────────────────────────────

const WEI_PER_GEN = 1_000_000_000_000_000_000n;   // 10^18
const MICRO_PER_GEN = 1_000_000n;                 // 10^6 — user-input precision floor
const WEI_PER_MICRO = 1_000_000_000_000n;          // 10^12

/**
 * Parse a user-entered GEN amount ("10", "0.5", "0.000001") into wei BigInt.
 * Six decimal places of precision are honoured; anything beyond is dropped.
 * Throws on garbage / negatives.
 */
export function parseGen(input: string | number): bigint {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid GEN amount");
  // Route through micro-GEN to sidestep JS float rounding at 18 decimals.
  const micro = BigInt(Math.round(n * 1_000_000));
  return micro * WEI_PER_MICRO;
}

/**
 * Format a wei value for display. Accepts BigInt, number, or numeric string.
 * Trims trailing zeros; shows up to 4 significant decimals for tiny values.
 */
export function formatGen(wei: bigint | number | string | null | undefined): string {
  if (wei === null || wei === undefined) return "—";
  let w: bigint;
  try {
    w = typeof wei === "bigint" ? wei : BigInt(wei.toString().split(".")[0]);
  } catch {
    return "—";
  }
  if (w === 0n) return "0";

  const whole = w / WEI_PER_GEN;
  const remainder = w % WEI_PER_GEN;

  if (remainder === 0n) return whole.toString();

  const remainderStr = remainder.toString().padStart(18, "0");
  const trimmed = remainderStr.replace(/0+$/, "").slice(0, 6);
  return `${whole.toString()}.${trimmed}`;
}
