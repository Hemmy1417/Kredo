"use client";

import { PageShell } from "@/components/PageShell";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { ProtocolStatsStrip } from "@/components/ProtocolStatsStrip";

/** The Vault — the pool of capital the house lends, owned by its depositors. */
export default function VaultPage() {
  return (
    <PageShell
      eyebrow="The Vault"
      title="The pool behind every loan"
      lede="Deposit GEN and hold shares of the book. Most of every interest payment accrues to the share price automatically — a slice is set aside as a loss reserve that absorbs defaults before you feel them. Withdraw your slice, principal and yield, whenever the idle reserve covers it."
    >
      <section className="animate-fade-in">
        <ProtocolStatsStrip />
      </section>

      <section className="animate-slide-up">
        <LiquidityPanel />
      </section>
    </PageShell>
  );
}
