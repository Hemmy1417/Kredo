"use client";

import { Loader2, Landmark, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useLoans, useRepayLoan, useLiquidateLoan, useKredoContract } from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Loan } from "@/lib/contracts/types";
import { formatGen } from "@/lib/utils";

export function LoanTable() {
  const contract = useKredoContract();
  const { data: loans, isLoading, isError } = useLoans();
  const { address, isConnected, isLoading: isWalletLoading } = useWallet();
  const { repayLoan, isRepaying, repayingLoanId } = useRepayLoan();
  const { liquidateLoan, isLiquidating, liquidatingLoanId } = useLiquidateLoan();

  const handleRepay = (loanId: string, repaymentAmount: bigint) => {
    if (!address) {
      error("Please connect your wallet to repay loans");
      return;
    }
    const confirmed = confirm(
      `Repay loan #${loanId}? Amount due: ${formatGen(repaymentAmount)} GEN`
    );
    if (confirmed) repayLoan({ loanId, repaymentAmount });
  };

  const handleLiquidate = (loanId: string) => {
    if (!address) {
      error("Please connect your wallet to liquidate loans");
      return;
    }
    const confirmed = confirm(
      `Liquidate loan #${loanId}? This will penalise the borrower's reputation.`
    );
    if (confirmed) liquidateLoan(loanId);
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
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loans.map((loan) => (
              <LoanRow
                key={loan.loan_id}
                loan={loan}
                currentAddress={address}
                isConnected={isConnected}
                isWalletLoading={isWalletLoading}
                onRepay={handleRepay}
                onLiquidate={handleLiquidate}
                isRepaying={isRepaying && repayingLoanId === loan.loan_id}
                isLiquidating={isLiquidating && liquidatingLoanId === loan.loan_id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LoanRowProps {
  loan: Loan;
  currentAddress: string | null;
  isConnected: boolean;
  isWalletLoading: boolean;
  onRepay: (loanId: string, repaymentAmount: bigint) => void;
  onLiquidate: (loanId: string) => void;
  isRepaying: boolean;
  isLiquidating: boolean;
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
  currentAddress,
  isConnected,
  isWalletLoading,
  onRepay,
  onLiquidate,
  isRepaying,
  isLiquidating,
}: LoanRowProps) {
  const isBorrower =
    currentAddress?.toLowerCase() === loan.borrower?.toLowerCase();
  const isActive = loan.status === "ACTIVE";
  const canRepay = isConnected && isBorrower && isActive && !isWalletLoading;
  const canLiquidate = isConnected && !isBorrower && isActive && !isWalletLoading;

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
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="text-accent border-accent/30">
          {aprPercent}%
        </Badge>
      </td>
      <td className="px-4 py-4">{statusBadge(loan.status)}</td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {canRepay && (
            <Button
              onClick={() => onRepay(loan.loan_id, loan.repayment_amount)}
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
              onClick={() => onLiquidate(loan.loan_id)}
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