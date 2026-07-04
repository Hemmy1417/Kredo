"use client";

import { useMemo } from "react";
import {
  ShieldCheck, ShieldAlert, Shield, RefreshCw, Sparkles,
  CheckCircle2, XCircle, Landmark, Star, Award, Trophy, Flame, Crown,
} from "lucide-react";
import { useReputation, useLoans, readAiRationale } from "@/lib/hooks/useKredo";
import { useScoreEvents } from "@/lib/hooks/useScoreEvents";
import { useWallet } from "@/lib/genlayer/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { computeAchievements, tierProgress } from "@/lib/achievements";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const TIER = (score: number) => {
  if (score >= 90) return { name: "Elite",    collateral: "70%",  apr: "5%",  ring: "ring-accent"     };
  if (score >= 75) return { name: "Trusted",  collateral: "90%",  apr: "8%",  ring: "ring-green-400"  };
  if (score >= 50) return { name: "Good",     collateral: "110%", apr: "12%", ring: "ring-yellow-400" };
  if (score >= 25) return { name: "Low-Med",  collateral: "130%", apr: "15%", ring: "ring-orange-400" };
  return                  { name: "Standard", collateral: "150%", apr: "20%", ring: "ring-red-400"    };
};

const ICONS: Record<string, any> = {
  ShieldCheck, Landmark, CheckCircle2, Star, Award, Trophy, Flame, Crown, Sparkles,
};

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function YourScoreCard() {
  const { address, isConnected } = useWallet();
  const { data: reputation, isLoading, isFetching, refetch } = useReputation(
    isConnected ? address : null,
  );
  const { data: allLoans } = useLoans();
  const { events } = useScoreEvents(address);
  const qc = useQueryClient();

  const rationale = useMemo(() => readAiRationale(address), [address, reputation?.score]);

  const myLoans = useMemo(
    () => (allLoans ?? []).filter(
      (l) => l.borrower?.toLowerCase() === address?.toLowerCase(),
    ),
    [allLoans, address],
  );

  const achievements = useMemo(
    () => computeAchievements({ reputation: reputation ?? null, events, loans: myLoans }),
    [reputation, events, myLoans],
  );

  const earnedCount = achievements.filter((a) => a.earned).length;

  if (!isConnected) return null;

  const score = Number(reputation?.score ?? 0);
  const verified = !!reputation?.verified;
  const tier = TIER(score);
  const progress = tierProgress(score);
  const pct = Math.min(100, Math.max(0, score));

  const Icon = score >= 75 ? ShieldCheck : score >= 25 ? Shield : ShieldAlert;

  const recentEvents = [...events].sort((a, b) => b.at - a.at).slice(0, 4);

  return (
    <div className={`brand-card p-6 ring-1 ring-inset ${tier.ring}/30 space-y-5`}>
      {/* Header row */}
      <div className="flex items-start gap-5 flex-wrap">
        <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ring-2 ${tier.ring}/40 bg-white/5`}>
          <Icon className={`w-7 h-7 ${score >= 75 ? "text-accent" : score >= 25 ? "text-yellow-400" : "text-red-400"}`} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Your reputation
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-4xl font-bold">{score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <span className={`text-sm font-semibold ${score >= 75 ? "text-accent" : score >= 25 ? "text-yellow-400" : "text-red-400"}`}>
              {tier.name}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {verified
              ? <>Unlocks <span className="text-foreground font-medium">{tier.collateral}</span> collateral · <span className="text-foreground font-medium">{tier.apr}</span> APR</>
              : "Unverified — click Verify identity in the nav to get a score"}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["reputation", address] });
            refetch();
          }}
          disabled={isLoading || isFetching}
          title="Refresh from chain"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tier progress bar */}
      {verified && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.nextTier
                ? <>Next tier: <span className="text-foreground font-medium">{progress.nextTier}</span> in {progress.pointsToNext} pts</>
                : <span className="text-accent font-medium">Top tier reached</span>}
            </span>
            <span className="text-muted-foreground">{progress.saving}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-purple-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* AI rationale */}
      {rationale && rationale.summary && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent/80 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI rationale
            {rationale.risk_tier && <span className="text-muted-foreground normal-case tracking-normal">· risk {rationale.risk_tier}</span>}
          </div>
          <p className="text-foreground/90 leading-relaxed">{rationale.summary}</p>
          {rationale.flags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rationale.flags.slice(0, 5).map((f, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            Evaluated {timeAgo(rationale.at)}
          </p>
        </div>
      )}

      {/* Achievements */}
      {earnedCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase tracking-wider text-muted-foreground">Achievements</span>
            <span className="text-muted-foreground">{earnedCount} / {achievements.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {achievements.filter((a) => a.earned).map((a) => {
              const AIcon = a.icon ? ICONS[a.icon] ?? Star : Star;
              return (
                <div
                  key={a.id}
                  title={a.hint}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/25 text-xs text-accent"
                >
                  <AIcon className="w-3 h-3" />
                  {a.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score timeline */}
      {recentEvents.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Recent activity</div>
          <ul className="space-y-1.5">
            {recentEvents.map((e) => {
              const positive = e.delta > 0;
              const negative = e.delta < 0;
              return (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <Badge
                    variant="outline"
                    className={
                      positive ? "bg-green-500/10 text-green-400 border-green-500/25" :
                      negative ? "bg-red-500/10 text-red-400 border-red-500/25" :
                      "bg-white/5 text-muted-foreground border-white/10"
                    }
                  >
                    {positive ? "+" : ""}{e.delta || "•"}
                  </Badge>
                  <span className="flex-1 text-foreground/90 truncate">{e.note}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(e.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
