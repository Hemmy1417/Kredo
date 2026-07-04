"use client";

import { useMemo, useState } from "react";
import { Bell, X, AlertTriangle, Clock } from "lucide-react";
import { useLoans } from "@/lib/hooks/useKredo";
import { useLoanTimestamps, computeLoanClock } from "@/lib/hooks/useLoanTimestamps";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils";

export function NotificationsBanner() {
  const { address, isConnected } = useWallet();
  const { data: loans } = useLoans();
  const timestamps = useLoanTimestamps(loans);
  const [dismissed, setDismissed] = useState(false);

  const alerts = useMemo(() => {
    if (!isConnected || !address || !loans) return [];
    return loans
      .filter((l) => l.status === "ACTIVE" && l.borrower?.toLowerCase() === address.toLowerCase())
      .map((l) => {
        const clock = computeLoanClock(l, timestamps);
        return { loan: l, clock };
      })
      .filter(({ clock }) => clock.remainingDays !== null && clock.remainingDays < 7)
      .sort((a, b) => (a.clock.remainingDays ?? 0) - (b.clock.remainingDays ?? 0));
  }, [loans, timestamps, address, isConnected]);

  if (dismissed || alerts.length === 0) return null;

  const overdue = alerts.filter((a) => (a.clock.remainingDays ?? 0) < 0);
  const dueSoon = alerts.filter((a) => (a.clock.remainingDays ?? 0) >= 0);

  const isCritical = overdue.length > 0;
  const wrap = isCritical
    ? "border-red-500/40 bg-red-500/10"
    : "border-orange-500/30 bg-orange-500/10";
  const iconColor = isCritical ? "text-red-400" : "text-orange-400";
  const Icon = isCritical ? AlertTriangle : Clock;

  return (
    <div className={`rounded-lg border ${wrap} p-4 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="w-4 h-4" />
          {isCritical
            ? `${overdue.length} loan${overdue.length > 1 ? "s" : ""} overdue`
            : `${dueSoon.length} loan${dueSoon.length > 1 ? "s" : ""} due soon`}
        </div>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {alerts.slice(0, 3).map(({ loan, clock }) => {
            const d = clock.remainingDays ?? 0;
            const label =
              d < 0 ? `Overdue by ${Math.abs(Math.round(d))}d`
              : d < 1 ? "Due today"
              : `Due in ${Math.round(d)}d`;
            return (
              <li key={loan.loan_id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <span className="text-foreground font-medium">#{loan.loan_id}</span>
                  {" — "}
                  Repay {formatGen(loan.repayment_amount)} GEN
                </span>
                <span className={`shrink-0 font-medium ${d < 0 ? "text-red-400" : d < 3 ? "text-orange-400" : "text-yellow-400"}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Dismiss notifications"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
