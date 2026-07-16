"use client";

import { PageShell } from "@/components/PageShell";
import { ReputationPanel } from "@/components/ReputationPanel";
import { ProtocolStatsStrip } from "@/components/ProtocolStatsStrip";

/** The Register — the public book: who stands well, and the whole ledger. */
export default function RegisterPage() {
  return (
    <PageShell
      eyebrow="The Register"
      title="The public book of standing"
      lede="Every score, repayment, and default is written to chain. This is the protocol-wide ledger — the borrowers in best standing, and the numbers behind the house."
    >
      <section className="animate-fade-in">
        <ProtocolStatsStrip />
      </section>

      <section className="animate-slide-up">
        <ReputationPanel layout="landscape" />
      </section>
    </PageShell>
  );
}
