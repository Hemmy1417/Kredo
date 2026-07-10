"use client";

import { useMemo, useState } from "react";
import { Droplets, Loader2, ArrowDownToLine, ArrowUpFromLine, Flame, Coins } from "lucide-react";
import {
  usePoolStats,
  useProtocolParams,
  useDepositLiquidity,
  useWithdrawLiquidity,
} from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { parseGen, formatGen } from "@/lib/utils";
import { error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

/**
 * The lending pool's public face: live solvency stats plus the LP deposit path
 * (anyone can add reserve) and an owner-only idle-reserve withdrawal. Without a
 * funded reserve the contract can't disburse any principal, so this panel is
 * what makes borrowing possible at all.
 */
export function LiquidityPanel() {
  const { address, isConnected } = useWallet();
  const { data: pool } = usePoolStats();
  const { data: params } = useProtocolParams();
  const { depositLiquidity, isDepositing } = useDepositLiquidity();
  const { withdrawLiquidity, isWithdrawing } = useWithdrawLiquidity();

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const isOwner = useMemo(() => {
    const owner = String(params?.owner ?? "").toLowerCase();
    return !!address && !!owner && owner === address.toLowerCase();
  }, [address, params?.owner]);

  const reserve = pool?.liquidity_reserve_wei ?? BigInt(0);
  const outstanding = pool?.outstanding_principal_wei ?? BigInt(0);
  const utilizationPct = Math.min(100, Math.round((pool?.utilization_bps ?? 0) / 100));
  const interestEarned = pool?.lifetime_interest_wei ?? BigInt(0);
  const writeoff = pool?.lifetime_writeoff_wei ?? BigInt(0);

  const handleDeposit = () => {
    if (!isConnected || !address) return error("Please connect your wallet first");
    if (!depositAmt || parseFloat(depositAmt) <= 0) return error("Enter a valid amount");
    depositLiquidity({ amount: parseGen(depositAmt) });
    setDepositAmt("");
  };

  const handleWithdraw = () => {
    if (!withdrawAmt || parseFloat(withdrawAmt) <= 0) return error("Enter a valid amount");
    withdrawLiquidity({ amount: parseGen(withdrawAmt) });
    setWithdrawAmt("");
  };

  return (
    <div className="brand-card p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Droplets className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Liquidity Pool</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real GEN the protocol lends against reputation
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground border border-white/10 px-3 py-1 rounded-full">
          {utilizationPct}% utilised
        </span>
      </div>

      {/* Reserve / outstanding / earnings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={Coins}       label="Available reserve" value={`${formatGen(reserve)} GEN`}      hint="Lendable now" accent />
        <Stat icon={ArrowUpFromLine} label="Outstanding"   value={`${formatGen(outstanding)} GEN`}  hint="Principal on loan" />
        <Stat icon={ArrowDownToLine} label="Interest earned" value={`${formatGen(interestEarned)} GEN`} hint="Booked profit" />
        <Stat icon={Flame}       label="Written off"      value={`${formatGen(writeoff)} GEN`}     hint="Default losses" />
      </div>

      {/* Utilization meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Pool utilisation</span>
          <span className="font-mono">{utilizationPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full gradient-purple-pink transition-all"
            style={{ width: `${Math.max(2, utilizationPct)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Higher utilisation raises the interest premium borrowers pay — protecting solvency and rewarding repayment.
        </p>
      </div>

      {/* Deposit (anyone) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Provide liquidity
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            min="0.000001"
            step="any"
            placeholder="Amount in GEN"
            value={depositAmt}
            onChange={(e) => setDepositAmt(e.target.value)}
          />
          <Button variant="gradient" onClick={handleDeposit} disabled={isDepositing || !isConnected}>
            {isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit"}
          </Button>
        </div>
      </div>

      {/* Withdraw (owner only) */}
      {isOwner && (
        <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Withdraw idle reserve · owner
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0.000001"
              step="any"
              placeholder="Amount in GEN"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
            />
            <Button variant="secondary" onClick={handleWithdraw} disabled={isWithdrawing}>
              {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Only un-lent reserve can leave — principal on active loans is locked.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="brand-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">{label}</div>
        <div className={`text-base font-bold leading-tight truncate ${accent ? "text-accent" : ""}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground truncate">{hint}</div>
      </div>
    </div>
  );
}
