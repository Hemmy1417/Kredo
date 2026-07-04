"use client";

import { useMemo } from "react";
import { Landmark, CircleDollarSign, TrendingUp, Users } from "lucide-react";
import { useLoans, useProtocolParams } from "@/lib/hooks/useKredo";
import { formatGen } from "@/lib/utils";

export function ProtocolStatsStrip() {
  const { data: loans } = useLoans();
  const { data: params } = useProtocolParams();

  const stats = useMemo(() => {
    const list = loans ?? [];
    const total = list.length;
    const active = list.filter((l) => l.status === "ACTIVE").length;
    const repaid = list.filter((l) => l.status === "REPAID").length;
    const liquidated = list.filter((l) => l.status === "LIQUIDATED").length;

    let escrowed = BigInt(0);
    for (const l of list) {
      if (l.status === "ACTIVE") {
        try { escrowed += BigInt(l.collateral_amount ?? 0); } catch { /* ignore */ }
      }
    }

    const settled = repaid + liquidated;
    const repayRate = settled > 0 ? Math.round((repaid / settled) * 100) : null;

    const uniqueBorrowers = new Set(list.map((l) => l.borrower?.toLowerCase()).filter(Boolean)).size;

    return { total, active, escrowed, repayRate, uniqueBorrowers };
  }, [loans]);

  const cards = [
    {
      icon: Landmark,
      label: "Loans issued",
      value: String(stats.total),
      hint: `${stats.active} active`,
    },
    {
      icon: CircleDollarSign,
      label: "GEN escrowed",
      value: `${formatGen(stats.escrowed)}`,
      hint: "Live collateral",
    },
    {
      icon: TrendingUp,
      label: "Repayment rate",
      value: stats.repayRate === null ? "—" : `${stats.repayRate}%`,
      hint: stats.repayRate === null ? "No settled loans yet" : "Repaid vs liquidated",
    },
    {
      icon: Users,
      label: "Borrowers",
      value: String(stats.uniqueBorrowers),
      hint: params?.owner ? "Unique wallets" : "Unique wallets",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="brand-card p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">{c.label}</div>
              <div className="text-lg font-bold leading-tight">{c.value}</div>
              <div className="text-[11px] text-muted-foreground truncate">{c.hint}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
