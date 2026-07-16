"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ProtocolStatsStrip } from "@/components/ProtocolStatsStrip";
import { ShieldCheck, Zap, TrendingUp, Lock } from "lucide-react";

const GOLD_GRADIENT = "linear-gradient(135deg, #D6AC57 0%, #E8CE93 100%)";

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

const rooms = [
  {
    href: "/desk",
    eyebrow: "The Desk",
    title: "Sit down with the bank",
    body: "Verify your footprint, preview the terms your standing commands, borrow against your word, repay and rise.",
    cta: "Take a seat →",
  },
  {
    href: "/vault",
    eyebrow: "The Vault",
    title: "Back the book, earn the interest",
    body: "Deposit GEN for shares of the pool. Interest accrues to the share price automatically; withdraw principal and yield any time the reserve is idle.",
    cta: "Open the vault →",
  },
  {
    href: "/register",
    eyebrow: "The Register",
    title: "The public book of standing",
    body: "Every score, repayment, and default on the ledger — the borrowers in best standing, in the open.",
    cta: "Read the register →",
  },
];

export default function HomePage() {
  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className="pt-10 pb-2 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <span className="text-xs font-mono text-accent/60 tracking-widest uppercase">
            A private-credit house on GenLayer
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>

        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.08] mb-6">
            Your word is
            <br />
            <span className="relative inline-block">
              <span
                style={{
                  background: GOLD_GRADIENT,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                your collateral
              </span>
              <span
                className="absolute -bottom-1 left-0 right-0 h-px opacity-60"
                style={{ background: GOLD_GRADIENT }}
              />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Kredo reads your on-chain history the way an old bank read a ledger —
            and lends real GEN against it. Better standing, less collateral,
            finer rates. Scored by validator consensus, not by anyone&rsquo;s say-so.
          </p>

          <div className="mt-9 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/desk" className="btn-primary !px-8 !py-3">
              Sit down at the Desk
            </Link>
            <Link href="/vault" className="btn-secondary !px-8 !py-3">
              Back the book
            </Link>
          </div>
        </div>
      </section>

      {/* ── The house, in numbers ── */}
      <section className="animate-fade-in">
        <ProtocolStatsStrip />
      </section>

      {/* ── The rooms ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        {rooms.map((room, i) => (
          <Link
            key={room.href}
            href={room.href}
            className="brand-card brand-card-hover p-7 flex flex-col animate-slide-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="text-xs font-mono text-accent/70 tracking-widest uppercase">
              {room.eyebrow}
            </span>
            <h3 className="text-xl mt-3 mb-2">{room.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-grow">
              {room.body}
            </p>
            <span className="text-sm text-accent mt-5">{room.cta}</span>
          </Link>
        ))}
      </section>

      {/* ── The rate card ── */}
      <section className="brand-card p-6 md:p-8 animate-fade-in">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold">The Rate Card</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your score determines your collateral ratio and APR — the house
              quotes the same card to everyone
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
      <section className="animate-fade-in">
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

      {/* ── Closing CTA ── */}
      <section className="text-center py-8 animate-fade-in">
        <h2 className="text-2xl md:text-3xl mb-3">
          The house is open.
        </h2>
        <p className="text-muted-foreground mb-7 max-w-lg mx-auto">
          Your history is already written on-chain — Kredo just reads it honestly.
        </p>
        <Link href="/desk" className="btn-primary !px-10 !py-3">
          Find out what your word is worth
        </Link>
      </section>
    </PageShell>
  );
}
