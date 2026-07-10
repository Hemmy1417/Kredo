"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Sparkles, Link2, History, Lock } from "lucide-react";
import { useEvaluateIdentity, useReputation } from "@/lib/hooks/useKredo";
import { useWallet, formatAddress } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

/**
 * Zero-input verification. All evidence is tied to the connected wallet:
 * the contract derives the authoritative footprint URLs from the address
 * itself and refuses evaluation from any other sender. There is nothing to
 * paste and nothing to fake — which is the point.
 */
export function EvaluateIdentityModal() {
  const { isConnected, address } = useWallet();
  const { evaluateIdentity, isEvaluating } = useEvaluateIdentity();
  const { data: reputation } = useReputation(address);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isConnected && isOpen && !isEvaluating) setIsOpen(false);
  }, [isConnected, isOpen, isEvaluating]);

  function submit() {
    if (!address) return;
    // identity_sources stays empty by design — the contract ignores it anyway
    evaluateIdentity(
      { borrowerAddress: address, identitySources: [], priorScore: reputation?.score ?? 0 },
      { onSuccess: () => setIsOpen(false) },
    );
  }

  const disabled = !isConnected || isEvaluating;
  const hasScore = typeof reputation?.score === "number" && reputation.score > 0;
  const footprintBase = address
    ? `https://eth.blockscout.com/api/v2/addresses/${address.toLowerCase()}`
    : "";

  const evidence = [
    {
      icon: Link2,
      title: "On-chain footprint · account profile",
      detail: footprintBase ? footprintBase.replace("https://", "") : "—",
    },
    {
      icon: Link2,
      title: "On-chain footprint · activity counters",
      detail: footprintBase ? `${footprintBase.replace("https://", "")}/counters` : "—",
    },
    {
      icon: History,
      title: "Kredo repayment record",
      detail: `${reputation?.total_loans_repaid ?? 0} repaid · ${reputation?.total_loans_defaulted ?? 0} defaulted (contract state)`,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasScore ? "outline" : "default"}
          size="sm"
          className="gap-2"
          disabled={!isConnected}
          title={!isConnected ? "Connect your wallet first" : ""}
        >
          <ShieldCheck className="w-4 h-4" />
          {hasScore ? "Re-verify identity" : "Verify identity"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Verify {formatAddress(address)}
          </DialogTitle>
          <DialogDescription>
            Nothing to paste. The contract derives your evidence from your address itself —
            validators fetch it independently, an AI credit analyst scores it 0–100, and
            consensus writes your score to chain.
          </DialogDescription>
        </DialogHeader>

        {/* The exact evidence the panel will read */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Evidence the validators will read
          </p>
          {evidence.map((e) => {
            const Icon = e.icon;
            return (
              <div key={e.title} className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                <Icon className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{e.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
          <span>
            All verification is tied to this wallet: only it can trigger its own scoring, and
            no user-supplied pages are ever read — so nobody can re-roll your score or borrow
            someone else's identity.
          </span>
        </div>

        {isEvaluating && (
          <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm flex items-start gap-3">
            <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-accent flex-shrink-0" />
            <div>
              <p className="font-medium">Validators are reading your footprint</p>
              <p className="text-xs text-muted-foreground mt-1">
                Independent fetches, LLM scoring, then consensus — takes one to three minutes.
                Keep this open.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isEvaluating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={disabled} className="gap-2">
            {isEvaluating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEvaluating ? "Evaluating…" : hasScore ? "Re-score my wallet" : "Score my wallet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
