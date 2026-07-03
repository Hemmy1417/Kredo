"use client";

import { ShieldCheck, ShieldAlert, Shield, Loader2, RefreshCw } from "lucide-react";
import { useReputation } from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";

const TIER = (score: number) => {
  if (score >= 90) return { name: "Elite",     collateral: "70%",  apr: "5%",  ring: "ring-accent"       };
  if (score >= 75) return { name: "Trusted",   collateral: "90%",  apr: "8%",  ring: "ring-green-400"    };
  if (score >= 50) return { name: "Good",      collateral: "110%", apr: "12%", ring: "ring-yellow-400"   };
  if (score >= 25) return { name: "Low-Med",   collateral: "130%", apr: "15%", ring: "ring-orange-400"   };
  return              { name: "Standard",  collateral: "150%", apr: "20%", ring: "ring-red-400"      };
};

export function YourScoreCard() {
  const { address, isConnected } = useWallet();
  const { data: reputation, isLoading, isFetching, refetch } = useReputation(
    isConnected ? address : null,
  );
  const qc = useQueryClient();

  if (!isConnected) return null;

  const score = reputation?.score ?? 0;
  const verified = !!reputation?.verified;
  const tier = TIER(score);

  const Icon = score >= 75 ? ShieldCheck : score >= 25 ? Shield : ShieldAlert;

  return (
    <div className={`brand-card p-6 ring-1 ring-inset ${tier.ring}/30`}>
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
    </div>
  );
}
