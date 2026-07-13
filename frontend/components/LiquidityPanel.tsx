"use client";

import { useMemo, useState } from "react";
import { Droplets, Loader2, ArrowDownToLine, ArrowUpFromLine, Flame, Coins, TrendingUp, PieChart } from "lucide-react";
import {
  usePoolStats,
  useProtocolParams,
  useDepositLiquidity,
  useWithdrawLiquidity,
  useClaimProtocolFees,
  useLpPosition,
} from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { parseGen, formatGen } from "@/lib/utils";
import { error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

/**
 * The lending pool's public face: live solvency stats, the LP deposit path
 * (a deposit mints pool shares), and each depositor's own position — current
 * value, earned yield, and a withdraw that redeems their shares. Repaid
 * interest raises the share price, so yield accrues to every LP pro-rata.
 */
export function LiquidityPanel() {
  const { address, isConnected } = useWallet();
  const { data: pool } = usePoolStats();
  const { data: params } = useProtocolParams();
  const { data: position } = useLpPosition();
  const { depositLiquidity, isDepositing } = useDepositLiquidity();
  const { withdrawLiquidity, isWithdrawing } = useWithdrawLiquidity();
  const { claimProtocolFees, isClaiming } = useClaimProtocolFees();

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
  const feesAccrued = pool?.protocol_fee_accrued_wei ?? BigInt(0);

  const myShares = position?.shares ?? BigInt(0);
  const myValue = position?.current_value_wei ?? BigInt(0);
  const myYield = position?.earned_yield_wei ?? BigInt(0);
  const myShareBps = position?.share_of_pool_bps ?? 0;
  const withdrawableNow = position?.withdrawable_now_wei ?? BigInt(0);

  const handleDeposit = () => {
    if (!isConnected || !address) return error("Please connect your wallet first");
    if (!depositAmt || parseFloat(depositAmt) <= 0) return error("Enter a valid amount");
    depositLiquidity({ amount: parseGen(depositAmt) });
    setDepositAmt("");
  };

  // The contract redeems SHARES; the input is in GEN. Convert at the live
  // share price (shares = amount × myShares / myValue) and cap at the wallet's
  // full holding so "everything I have" never over-asks by a rounding wei.
  const handleWithdraw = () => {
    if (!withdrawAmt || parseFloat(withdrawAmt) <= 0) return error("Enter a valid amount");
    if (myShares <= BigInt(0)) return error("No active deposit to withdraw");
    if (myValue <= BigInt(0)) return error("Your shares are currently worth zero — nothing to withdraw");
    const amount = parseGen(withdrawAmt);
    let shares = amount >= myValue ? myShares : (amount * myShares) / myValue;
    if (shares <= BigInt(0)) return error("Amount too small");
    if (shares > myShares) shares = myShares;
    withdrawLiquidity({ shares });
    setWithdrawAmt("");
  };

  const handleWithdrawAll = () => {
    if (myShares <= BigInt(0)) return error("No active deposit to withdraw");
    withdrawLiquidity({ shares: myShares });
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

      {/* Deposit (anyone) — mints pool shares */}
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
        <p className="text-[11px] text-muted-foreground">
          A deposit mints pool shares. 90% of every repaid loan&apos;s interest accrues to the
          shares automatically — your slice grows without another transaction.
        </p>
      </div>

      {/* Your LP position (any depositor) */}
      {isConnected && myShares > BigInt(0) && (
        <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your position
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat icon={Coins} label="Deposit value" value={`${formatGen(myValue)} GEN`} hint="Redeemable at share price" accent />
            <Stat
              icon={TrendingUp}
              label="Earned yield"
              value={`${myYield < BigInt(0) ? "−" : "+"}${formatGen(myYield < BigInt(0) ? -myYield : myYield)} GEN`}
              hint="Value minus what you put in"
              accent={myYield > BigInt(0)}
            />
            <Stat icon={PieChart} label="Share of pool" value={`${(myShareBps / 100).toFixed(2)}%`} hint={`${formatGen(myShares)} shares`} />
          </div>
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
            <Button variant="outline" onClick={handleWithdrawAll} disabled={isWithdrawing}>
              All
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Withdrawals redeem your shares — principal plus earned yield. Up to{" "}
            {formatGen(withdrawableNow)} GEN is redeemable right now; capital out on active
            loans returns as borrowers repay.
          </p>
        </div>
      )}

      {/* Protocol revenue (owner only) */}
      {isOwner && feesAccrued > BigInt(0) && (
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="text-sm text-muted-foreground">
            Protocol fees accrued:{" "}
            <span className="font-mono text-foreground">{formatGen(feesAccrued)} GEN</span>
            <span className="text-[11px] block">10% of interest — the only pot the owner can withdraw</span>
          </div>
          <Button variant="secondary" onClick={() => claimProtocolFees()} disabled={isClaiming}>
            {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim fees"}
          </Button>
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
