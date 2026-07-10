"use client";

import { useMemo, useState } from "react";
import { Loader2, Landmark, Clock, AlertCircle, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { useLoans, useRepayLoan, useLiquidateLoan, useKredoContract, useReputation, useProtocolParams } from "@/lib/hooks/useKredo";
import { useLoanTimestamps, computeLoanClock, timeAgo } from "@/lib/hooks/useLoanTimestamps";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Loan } from "@/lib/contracts/types";
import { formatGen } from "@/lib/utils";

type LoanClock = ReturnType<typeof computeLoanClock>;

export function LoanTable() {
  const contract = useKredoContract();
  const { data: loans, isLoading, isError } = useLoans();
  const { address, isConnected, isLoading: isWalletLoading } = useWallet();
  const { repayLoan, isRepaying, repayingLoanId } = useRepayLoan();
  const { liquidateLoan, isLiquidating, liquidatingLoanId } = useLiquidateLoan();
  const { data: reputation } = useReputation(address);
  const { data: params } = useProtocolParams();
  const timestamps = useLoanTimestamps(loans);

  // Liquidation is a keeper action: owner-only on the contract, so only the
  // owner sees the button (anyone else's tx would just revert on-chain).
  const isOwner =
    !!address &&
    !!params?.owner &&
    String(params.owner).toLowerCase() === address.toLowerCase();
  const [filter, setFilter] = useState<"all" | "active" | "repaid" | "liquidated" | "mine">("all");

  const filtered = useMemo(() => {
    const list = loans ?? [];
    if (filter === "all") return list;
    if (filter === "mine") return list.filter((l) => l.borrower?.toLowerCase() === address?.toLowerCase());
    if (filter === "active") return list.filter((l) => l.status === "ACTIVE");
    if (filter === "repaid") return list.filter((l) => l.status === "REPAID");
    if (filter === "liquidated") return list.filter((l) => l.status === "LIQUIDATED");
    return list;
  }, [loans, filter, address]);

  const counts = useMemo(() => {
    const list = loans ?? [];
    return {
      all: list.length,
      active: list.filter((l) => l.status === "ACTIVE").length,
      repaid: list.filter((l) => l.status === "REPAID").length,
      liquidated: list.filter((l) => l.status === "LIQUIDATED").length,
      mine: list.filter((l) => l.borrower?.toLowerCase() === address?.toLowerCase()).length,
    };
  }, [loans, address]);

  const handleRepay = (loan: Loan) => {
    if (!address) {
      error("Please connect your wallet to repay loans");
      return;
    }
    const clock = computeLoanClock(loan, timestamps);
    const dueBits =
      clock.remainingDays === null
        ? ""
        : clock.remainingDays >= 0
        ? `\nDue in ${Math.max(1, Math.round(clock.remainingDays))} day(s).`
        : `\nOverdue by ${Math.abs(Math.round(clock.remainingDays))} day(s).`;
    const confirmed = confirm(
      `Repay loan #${loan.loan_id}?\n\n` +
      `Refund of your collateral: ${formatGen(loan.collateral_amount)} GEN.\n` +
      `Your reputation score gets a +5 boost (capped at 100).${dueBits}`
    );
    if (confirmed) repayLoan({
      loanId: loan.loan_id,
      repaymentAmount: loan.repayment_amount,
      priorScore: reputation?.score ?? 0,
    });
  };

  const handleLiquidate = (loan: Loan) => {
    if (!address) {
      error("Please connect your wallet to liquidate loans");
      return;
    }
    const confirmed = confirm(
      `Liquidate loan #${loan.loan_id}?\n\n` +
      `The escrowed collateral (${formatGen(loan.collateral_amount)} GEN) is seized into the pool reserve; ` +
      `any shortfall vs the disbursed principal is booked as a write-off.\n` +
      `The borrower's reputation score drops by up to 20 points.`
    );
    if (confirmed) liquidateLoan({
      loanId: loan.loan_id,
      borrowerAddress: loan.borrower,
      priorBorrowerScore: loan.reputation_score_at_origination ?? 0,
    });
  };

  if (isLoading) {
    return (
      <div className="brand-card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading loans...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-yellow-400 opacity-60" />
          <h3 className="text-xl font-bold">Setup Required</h3>
          <div className="space-y-2">
            <p className="text-muted-foreground">Contract address not configured.</p>
            <p className="text-sm text-muted-foreground">
              Please set{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                NEXT_PUBLIC_CONTRACT_ADDRESS
              </code>{" "}
              in your .env file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="brand-card p-8">
        <div className="text-center">
          <p className="text-destructive">Failed to load loans. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!loans || loans.length === 0) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-3">
          <Landmark className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-bold">No Loans Yet</h3>
          <p className="text-muted-foreground">
            Verify your identity and request the first loan!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-card p-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {([
          ["all", "All"],
          ["active", "Active"],
          ["mine", "Mine"],
          ["repaid", "Repaid"],
          ["liquidated", "Liquidated"],
        ] as const).map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} <span className="opacity-60">({counts[key]})</span>
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Borrower
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Collateral
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                APR
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((loan) => (
              <LoanRow
                key={loan.loan_id}
                loan={loan}
                clock={computeLoanClock(loan, timestamps)}
                currentAddress={address}
                isConnected={isConnected}
                isWalletLoading={isWalletLoading}
                isOwner={isOwner}
                onRepay={handleRepay}
                onLiquidate={handleLiquidate}
                isRepaying={isRepaying && repayingLoanId === loan.loan_id}
                isLiquidating={isLiquidating && liquidatingLoanId === loan.loan_id}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-muted-foreground border-t border-white/5">
        Timestamps are tracked by your browser. Studionet has no on-chain wall-clock — a production
        deploy would source time from a validator oracle.
      </p>
    </div>
  );
}

interface LoanRowProps {
  loan: Loan;
  clock: LoanClock;
  currentAddress: string | null;
  isConnected: boolean;
  isWalletLoading: boolean;
  isOwner: boolean;
  onRepay: (loan: Loan) => void;
  onLiquidate: (loan: Loan) => void;
  isRepaying: boolean;
  isLiquidating: boolean;
}

function DueChip({ clock, status }: { clock: LoanClock; status: string }) {
  if (status === "REPAID") return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "LIQUIDATED") return <span className="text-xs text-muted-foreground">Closed</span>;
  if (clock.remainingDays === null) {
    return <span className="text-xs text-muted-foreground">Not observed here</span>;
  }
  const d = clock.remainingDays;
  const label =
    d < 0 ? `Overdue by ${Math.abs(Math.round(d))}d`
    : d < 1 ? "Due today"
    : `Due in ${Math.round(d)}d`;
  const cls =
    d < 0 ? "bg-red-500/15 text-red-400 border-red-500/30"
    : d < 3 ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
    : d < 7 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-green-500/15 text-green-400 border-green-500/30";
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "REPAID":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Repaid
        </Badge>
      );
    case "LIQUIDATED":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Liquidated
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
  }
}

function LoanRow({
  loan,
  clock,
  currentAddress,
  isConnected,
  isWalletLoading,
  isOwner,
  onRepay,
  onLiquidate,
  isRepaying,
  isLiquidating,
}: LoanRowProps) {
  const isBorrower =
    currentAddress?.toLowerCase() === loan.borrower?.toLowerCase();
  const isActive = loan.status === "ACTIVE";
  const canRepay = isConnected && isBorrower && isActive && !isWalletLoading;
  // Owner-only keeper action (the contract enforces it; anyone else would
  // revert). The owner may liquidate their own loan too — collateral goes to
  // the pool reserve, not to the caller, so there's no self-dealing.
  const canLiquidate = isConnected && isOwner && isActive && !isWalletLoading;

  const aprPercent = ((loan.interest_rate_apr ?? 0) * 100).toFixed(1);
  const collateralPct = ((loan.collateral_ratio ?? 0) * 100).toFixed(0);

  return (
    <tr className="group hover:bg-white/5 transition-colors animate-fade-in">
      <td className="px-4 py-4">
        <span className="text-sm font-mono text-muted-foreground">
          #{loan.loan_id}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <AddressDisplay address={loan.borrower} maxLength={10} showCopy />
          {isBorrower && (
            <Badge variant="secondary" className="text-xs">
              You
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {formatGen(loan.loan_amount)} GEN
          </span>
          <span className="text-xs text-muted-foreground">
            Repay: {formatGen(loan.repayment_amount)} GEN
          </span>
          {clock.createdAt !== null && (
            <span className="text-[11px] text-muted-foreground/70 mt-0.5">
              Requested {timeAgo(clock.createdAt)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm">
            {formatGen(loan.collateral_amount)} GEN
          </span>
          <span className="text-xs text-muted-foreground">
            {collateralPct}% ratio
          </span>
          {loan.reputation_score_at_origination != null && (
            <span className="text-[11px] text-muted-foreground/70 mt-0.5 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Score {loan.reputation_score_at_origination} at request
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="text-accent border-accent/30">
          {aprPercent}%
        </Badge>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm">{loan.duration_days ?? "—"} d</span>
      </td>
      <td className="px-4 py-4">
        <DueChip clock={clock} status={loan.status} />
      </td>
      <td className="px-4 py-4">{statusBadge(loan.status)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {canRepay && (
            <Button
              onClick={() => onRepay(loan)}
              disabled={isRepaying}
              size="sm"
              variant="gradient"
            >
              {isRepaying ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Repaying...
                </>
              ) : (
                "Repay"
              )}
            </Button>
          )}
          {canLiquidate && (
            <Button
              onClick={() => onLiquidate(loan)}
              disabled={isLiquidating}
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30"
            >
              {isLiquidating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Liquidating...
                </>
              ) : (
                "Liquidate"
              )}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}