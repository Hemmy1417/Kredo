"use client";

import { ShieldCheck, ShieldAlert, Shield, Loader2, AlertCircle } from "lucide-react";
import { useTopBorrowers, useKredoContract } from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";

export function ReputationPanel() {
  const contract = useKredoContract();
  const { data: borrowers, isLoading, isError } = useTopBorrowers();
  const { address } = useWallet();

  const scoreColor = (score: number) =>
    score >= 75
      ? "text-green-400"
      : score >= 50
      ? "text-yellow-400"
      : score >= 25
      ? "text-orange-400"
      : "text-red-400";

  const scoreIcon = (score: number, cls = "w-5 h-5") => {
    if (score >= 75) return <ShieldCheck className={`${cls} text-green-400`} />;
    if (score >= 25) return <Shield className={`${cls} text-yellow-400`} />;
    return <ShieldAlert className={`${cls} text-red-400`} />;
  };

  if (isLoading) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          Top Borrowers
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          Top Borrowers
        </h2>
        <div className="text-center py-8 space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 opacity-60" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Setup Required</p>
            <p className="text-xs text-muted-foreground">
              Contract address not configured
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !borrowers) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          Top Borrowers
        </h2>
        <div className="text-center py-8">
          <p className="text-sm text-destructive">Failed to load reputation data</p>
        </div>
      </div>
    );
  }

  if (borrowers.length === 0) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          Top Borrowers
        </h2>
        <div className="text-center py-8">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No verified borrowers yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-card p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-accent" />
        Top Borrowers
      </h2>

      <div className="space-y-2">
        {borrowers.map((entry, index) => {
          const isCurrentUser =
            address?.toLowerCase() === entry.address?.toLowerCase();
          const rank = index + 1;

          return (
            <div
              key={entry.address}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all
                ${
                  isCurrentUser
                    ? "bg-accent/20 border-2 border-accent/50"
                    : "hover:bg-white/5"
                }
              `}
            >
              {/* Rank with shield icon */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {rank <= 3
                  ? scoreIcon(entry.score)
                  : (
                    <span className="text-sm font-bold text-muted-foreground">
                      #{rank}
                    </span>
                  )}
              </div>

              {/* Address */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <AddressDisplay
                    address={entry.address}
                    maxLength={10}
                    className="text-sm"
                    showCopy
                  />
                  {isCurrentUser && (
                    <span className="text-xs bg-accent/30 text-accent px-2 py-0.5 rounded-full font-semibold">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.total_loans_repaid ?? 0} repaid ·{" "}
                  {entry.total_loans_defaulted ?? 0} defaulted
                </p>
              </div>

              {/* Score */}
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-bold ${scoreColor(entry.score)}`}>
                    {entry.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {borrowers.length > 10 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-center text-muted-foreground">
            Showing top {Math.min(10, borrowers.length)} borrowers
          </p>
        </div>
      )}
    </div>
  );
}
