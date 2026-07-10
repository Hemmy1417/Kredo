"use client";

import { Navbar } from "@/components/Navbar";
import { LoanTable } from "@/components/LoanTable";
import { ReputationPanel } from "@/components/ReputationPanel";
import { YourScoreCard } from "@/components/YourScoreCard";
import { ProtocolStatsStrip } from "@/components/ProtocolStatsStrip";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { NotificationsBanner } from "@/components/NotificationsBanner";
import { ShieldCheck, Zap, TrendingUp, Lock } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ShieldCheck,
    title: "Verify Your Wallet",
    body: "One click, nothing to paste. The contract reads your wallet's own on-chain footprint — no one else can submit it or fake it. GenLayer's AI scores your reputation 0–100 via validator consensus.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Preview Terms",
    body: "See your collateral ratio and APR before committing. Higher scores unlock undercollateralised loans and lower interest rates — instantly, on-chain.",
  },
  {
    number: "03",
    icon: Lock,
    title: "Borrow",
    body: "Request a loan with the collateral your score requires. The smart contract enforces the ratio — no manual approval, no intermediaries.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Repay & Grow",
    body: "On-time repayment boosts your score, unlocking better terms next time. Defaults are penalised. Your reputation is your credit history.",
  },
];

const tiers = [
  { label: "Standard",   score: "0 – 24",    collateral: "150%", apr: "20%", color: "text-red-400",    bar: "w-1/4 bg-red-500/40"    },
  { label: "Low-medium", score: "25 – 49",   collateral: "130%", apr: "15%", color: "text-orange-400", bar: "w-2/4 bg-orange-500/40"  },
  { label: "Good",       score: "50 – 74",   collateral: "110%", apr: "12%", color: "text-yellow-400", bar: "w-3/4 bg-yellow-500/40"  },
  { label: "Trusted",    score: "75 – 89",   collateral: "90%",  apr: "8%",  color: "text-green-400",  bar: "w-4/5 bg-green-500/40"   },
  { label: "Elite",      score: "90 – 100",  collateral: "70%",  apr: "5%",  color: "text-accent",     bar: "w-full bg-accent/40"     },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* ── Hero ── */}
          <section className="pt-8 pb-4 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <span className="text-xs font-mono text-accent/60 tracking-widest uppercase">
                Powered by GenLayer
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            </div>

            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-5 tracking-tight">
                Borrow on{" "}
                <span className="relative inline-block">
                  <span
                    style={{
                      background: "linear-gradient(135deg, #9B6AF6 0%, #E37DF7 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    your reputation
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-px opacity-60" style={{ background: "linear-gradient(135deg, #9B6AF6 0%, #E37DF7 100%)" }} />
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Link your real-world identity to an on-chain reputation score.
                Better standing unlocks less collateral and lower rates —
                automatically, trustlessly.
              </p>
            </div>
          </section>

          {/* ── Protocol stats strip ── */}
          <section className="animate-fade-in">
            <ProtocolStatsStrip />
          </section>

          {/* ── Notifications for connected borrower ── */}
          <section className="animate-fade-in">
            <NotificationsBanner />
          </section>

          {/* ── Your reputation (only when connected) ── */}
          <section className="animate-fade-in">
            <YourScoreCard />
          </section>

          {/* ── Liquidity pool (real capital that funds loans) ── */}
          <section className="animate-fade-in">
            <LiquidityPanel />
          </section>

          {/* ── Loans ── */}
          <section className="animate-slide-up">
            <LoanTable />
          </section>

          {/* ── Top borrowers (landscape strip beneath loans) ── */}
          <section
            className="animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <ReputationPanel layout="landscape" />
          </section>

          {/* ── Score tiers ── */}
          <section
            className="brand-card p-6 md:p-8 animate-fade-in"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold">Reputation Tiers</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your score determines your collateral ratio and APR
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground border border-white/10 px-3 py-1 rounded-full">
                Score 0 → 100
              </span>
            </div>

            <div className="space-y-3">
              {tiers.map((tier) => (
                <div key={tier.label} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <span className={`text-xs font-mono font-semibold ${tier.color}`}>
                      {tier.score}
                    </span>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${tier.bar}`} />
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground w-44">
                    <span>
                      <span className="text-foreground font-semibold">{tier.collateral}</span> collateral
                    </span>
                    <span>
                      <span className={`font-semibold ${tier.color}`}>{tier.apr}</span> APR
                    </span>
                  </div>
                  <div className="hidden md:block w-20 text-right">
                    <span className="text-xs text-muted-foreground">{tier.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it works ── */}
          <section
            className="animate-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">How it Works</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Four steps from wallet to loan
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="brand-card brand-card-hover p-6 space-y-4 animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-white/10 font-mono">
                        {step.number}
                      </span>
                      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-accent/30 to-transparent" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-xs text-muted-foreground font-mono">
              Kredo · Reputation-based Lending on GenLayer ·{" "}
              <a
                href={`https://explorer-studio.genlayer.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                Verify on explorer ↗
              </a>
            </span>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                GenLayer
              </a>
              <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                Studio
              </a>
              <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                Docs
              </a>
              <a href="https://github.com/genlayerlabs/genlayer-project-boilerplate" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}