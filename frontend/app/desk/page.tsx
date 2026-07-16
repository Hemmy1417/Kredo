"use client";

import { PageShell } from "@/components/PageShell";
import { NotificationsBanner } from "@/components/NotificationsBanner";
import { YourScoreCard } from "@/components/YourScoreCard";
import { LoanTable } from "@/components/LoanTable";

/** The Desk — where a member sits down with the bank: standing, terms, loans. */
export default function DeskPage() {
  return (
    <PageShell
      eyebrow="The Desk"
      title="Your standing, your terms"
      lede="Verify your on-chain footprint, see the terms your reputation commands, and take a loan against your word. Repayment is remembered; so is default."
    >
      <section className="animate-fade-in">
        <NotificationsBanner />
      </section>

      <section className="animate-fade-in">
        <YourScoreCard />
      </section>

      <section className="animate-slide-up">
        <LoanTable />
      </section>
    </PageShell>
  );
}
