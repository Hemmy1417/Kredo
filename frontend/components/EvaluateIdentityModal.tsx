"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, X, Loader2, Sparkles } from "lucide-react";
import { useEvaluateIdentity, useReputation } from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { error as toastError } from "@/lib/utils/toast";
import type { IdentitySource } from "@/lib/contracts/types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type SourceType = IdentitySource["type"];

// URLs that pass GenLayer validators' fetcher. Etherscan, LinkedIn, and most
// crypto explorers return 403 to non-browser user agents — they'll kill the
// consensus round. Suggest fetch-friendly alternatives instead.
const SOURCE_TYPES: { value: SourceType; label: string; placeholder: string }[] = [
  { value: "ens",              label: "ENS name",         placeholder: "https://ens.mirror.xyz/… or a public ENS bio page" },
  { value: "onchain_history",  label: "On-chain history", placeholder: "https://blockscout.com/eth/mainnet/address/0x…" },
  { value: "gitcoin_passport", label: "Gitcoin Passport", placeholder: "https://gitcoin.co/profile/… (public)" },
  { value: "credit_api",       label: "Other public identity signal", placeholder: "https://en.wikipedia.org/wiki/… or a personal blog / GitHub README" },
];

type Draft = { type: SourceType; url: string };

const MAX_SOURCES = 5;

export function EvaluateIdentityModal() {
  const { isConnected, address } = useWallet();
  const { evaluateIdentity, isEvaluating } = useEvaluateIdentity();
  const { data: reputation } = useReputation(address);

  const [isOpen, setIsOpen] = useState(false);
  const [sources, setSources] = useState<Draft[]>([{ type: "onchain_history", url: "" }]);

  useEffect(() => {
    if (!isConnected && isOpen && !isEvaluating) setIsOpen(false);
  }, [isConnected, isOpen, isEvaluating]);

  function addSource() {
    if (sources.length >= MAX_SOURCES) return;
    setSources((s) => [...s, { type: "ens", url: "" }]);
  }

  function updateSource(i: number, patch: Partial<Draft>) {
    setSources((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removeSource(i: number) {
    setSources((s) => (s.length === 1 ? s : s.filter((_, idx) => idx !== i)));
  }

  function submit() {
    if (!address) return;
    const clean = sources
      .map((s) => ({ ...s, url: s.url.trim() }))
      .filter((s) => s.url.length > 0);

    if (clean.length === 0) {
      toastError("Add at least one identity source.");
      return;
    }
    for (const s of clean) {
      if (!/^https?:\/\//i.test(s.url)) {
        toastError("URLs must start with http(s)://");
        return;
      }
    }

    const identitySources: IdentitySource[] = clean.map((s) => ({
      type: s.type,
      url: s.url,
      label: SOURCE_TYPES.find((t) => t.value === s.type)?.label ?? s.type,
    }));

    evaluateIdentity(
      { borrowerAddress: address, identitySources },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSources([{ type: "onchain_history", url: "" }]);
        },
      },
    );
  }

  const disabled = !isConnected || isEvaluating;
  const hasScore = typeof reputation?.score === "number" && reputation.score > 0;

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
            Verify your identity
          </DialogTitle>
          <DialogDescription>
            Paste up to {MAX_SOURCES} public URLs — GenLayer validators fetch each one
            independently, an LLM scores the combined evidence 0–100, and consensus writes
            your score to chain. Better score, better loan terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {sources.map((s, i) => {
            const meta = SOURCE_TYPES.find((t) => t.value === s.type)!;
            return (
              <div key={i} className="space-y-2 p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Source {i + 1}
                  </Label>
                  {sources.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => removeSource(i)}
                      disabled={isEvaluating}
                      aria-label={`Remove source ${i + 1}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <select
                  value={s.type}
                  onChange={(e) => updateSource(i, { type: e.target.value as SourceType })}
                  disabled={isEvaluating}
                  className="w-full h-9 px-3 rounded-md bg-background border border-white/10 text-sm"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Input
                  value={s.url}
                  onChange={(e) => updateSource(i, { url: e.target.value })}
                  placeholder={meta.placeholder}
                  disabled={isEvaluating}
                />
              </div>
            );
          })}

          {sources.length < MAX_SOURCES && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 w-full border border-dashed border-white/15"
              onClick={addSource}
              disabled={isEvaluating}
            >
              <Plus className="w-4 h-4" />
              Add another source
            </Button>
          )}
        </div>

        {isEvaluating && (
          <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm flex items-start gap-3">
            <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-accent flex-shrink-0" />
            <div>
              <p className="font-medium">Validators are reading your sources</p>
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
            {isEvaluating ? "Evaluating…" : "Submit for scoring"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
