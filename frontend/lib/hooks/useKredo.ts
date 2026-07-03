"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Kredo from "../contracts/kredo";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type {
  Loan,
  ReputationProfile,
  TopBorrowerEntry,
  IdentitySource,
} from "../contracts/types";

/**
 * Hook to get the Kredo contract instance.
 * Returns null if contract address is not configured.
 * Recreated whenever wallet address changes.
 */
export function useKredoContract(): Kredo | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank"),
        }
      );
      return null;
    }
    return new Kredo(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

// ─── READ HOOKS ──────────────────────────────────────────────────────────────

/**
 * Fetch all loans from the contract.
 */
export function useLoans() {
  const contract = useKredoContract();

  return useQuery<Loan[], Error>({
    queryKey: ["loans"],
    queryFn: () => (contract ? contract.getLoans() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Fetch a single loan by ID.
 */
export function useLoan(loanId: string | null) {
  const contract = useKredoContract();

  return useQuery<Loan | null, Error>({
    queryKey: ["loan", loanId],
    queryFn: () =>
      contract && loanId ? contract.getLoan(loanId) : Promise.resolve(null),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!loanId,
  });
}

/**
 * Fetch reputation profile for an address.
 * Returns null without hitting the contract if address is empty.
 * The contract raises UserError for unverified addresses — we return
 * a default profile instead of crashing.
 */
export function useReputation(address: string | null) {
  const contract = useKredoContract();

  return useQuery<ReputationProfile | null, Error>({
    queryKey: ["reputation", address],
    queryFn: async () => {
      if (!contract || !address) return null;
      return contract.getReputation(address);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    // Only fetch if we have both contract and a real address
    enabled: !!contract && !!address && address.length > 0,
  });
}

/**
 * Derive top borrowers from loans that have REPAID status —
 * only fetch reputation for addresses that have completed a loan,
 * meaning they are guaranteed to have a profile on-chain.
 */
export function useTopBorrowers() {
  const contract = useKredoContract();
  const { data: loans } = useLoans();

  return useQuery<TopBorrowerEntry[], Error>({
    queryKey: ["topBorrowers", loans],
    queryFn: async () => {
      if (!contract || !loans || loans.length === 0) return [];

      // Only fetch reputation for borrowers with at least one completed loan
      // — these are guaranteed to have an on-chain profile
      const activeBorrowers = loans
        .filter((l) => l.status === "REPAID" || l.status === "LIQUIDATED")
        .map((l) => l.borrower)
        .filter(Boolean);

      const uniqueAddresses = [...new Set(activeBorrowers)];
      if (uniqueAddresses.length === 0) return [];

      const profiles = await Promise.allSettled(
        uniqueAddresses.map((addr) => contract.getReputation(addr))
      );

      return profiles
        .filter((r): r is PromiseFulfilledResult<ReputationProfile> =>
          r.status === "fulfilled" && !!r.value && r.value.verified
        )
        .map((r) => ({
          address: r.value.address,
          score: r.value.score,
          total_loans_repaid: r.value.total_loans_repaid,
          total_loans_defaulted: r.value.total_loans_defaulted,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Fetch protocol-level parameters.
 */
export function useProtocolParams() {
  const contract = useKredoContract();

  return useQuery({
    queryKey: ["protocolParams"],
    queryFn: () =>
      contract ? contract.getProtocolParams() : Promise.resolve(null),
    staleTime: 10000,
    enabled: !!contract,
  });
}

// ─── WRITE HOOKS ─────────────────────────────────────────────────────────────

/**
 * Evaluate identity sources and compute a reputation score (AI-powered).
 */
export function useEvaluateIdentity() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      borrowerAddress,
      identitySources,
    }: {
      borrowerAddress: string;
      identitySources: IdentitySource[];
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsEvaluating(true);
      return contract.evaluateIdentity(borrowerAddress, identitySources);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      setIsEvaluating(false);
      success("Identity evaluated!", {
        description: "Your reputation score has been updated on-chain.",
      });
    },
    onError: (err: any) => {
      setIsEvaluating(false);
      error("Failed to evaluate identity", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isEvaluating,
    evaluateIdentity: mutation.mutate,
    evaluateIdentityAsync: mutation.mutateAsync,
  };
}

/**
 * Request a new loan.
 */
export function useRequestLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      borrowerAddress,
      loanAmount,
      collateralAmount,
      durationDays,
    }: {
      borrowerAddress: string;
      loanAmount: number;
      collateralAmount: number;
      durationDays: number;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRequesting(true);
      return contract.requestLoan(
        borrowerAddress,
        loanAmount,
        collateralAmount,
        durationDays
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["protocolParams"] });
      setIsRequesting(false);
      success("Loan requested!", {
        description: "Your loan has been recorded on the blockchain.",
      });
    },
    onError: (err: any) => {
      setIsRequesting(false);
      error("Failed to request loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRequesting,
    isSuccess: mutation.isSuccess,
    requestLoan: mutation.mutate,
    requestLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Repay an active loan.
 */
export function useRepayLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      loanId,
      repaymentAmount,
    }: {
      loanId: string;
      repaymentAmount: number;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRepaying(true);
      setRepayingLoanId(loanId);
      return contract.repayLoan(loanId, repaymentAmount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      setIsRepaying(false);
      setRepayingLoanId(null);
      success("Loan repaid!", {
        description: "Your reputation score has been boosted.",
      });
    },
    onError: (err: any) => {
      setIsRepaying(false);
      setRepayingLoanId(null);
      error("Failed to repay loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRepaying,
    repayingLoanId,
    repayLoan: mutation.mutate,
    repayLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Liquidate a defaulted loan.
 */
export function useLiquidateLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [liquidatingLoanId, setLiquidatingLoanId] = useState<string | null>(
    null
  );

  const mutation = useMutation({
    mutationFn: async (loanId: string) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsLiquidating(true);
      setLiquidatingLoanId(loanId);
      return contract.liquidateLoan(loanId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      setIsLiquidating(false);
      setLiquidatingLoanId(null);
      success("Loan liquidated!", {
        description: "The borrower's reputation has been penalised.",
      });
    },
    onError: (err: any) => {
      setIsLiquidating(false);
      setLiquidatingLoanId(null);
      error("Failed to liquidate loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isLiquidating,
    liquidatingLoanId,
    liquidateLoan: mutation.mutate,
    liquidateLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Preview loan terms without committing — returns a promise directly
 * so it can be called imperatively inside form effects.
 */
export function usePreviewLoanTerms() {
  const contract = useKredoContract();
  const [isFetching, setIsFetching] = useState(false);

  const preview = async ({
    borrowerAddress,
    loanAmount,
    durationDays,
  }: {
    borrowerAddress: string;
    loanAmount: number;
    durationDays: number;
  }) => {
    if (!contract) return null;
    setIsFetching(true);
    try {
      return await contract.previewLoanTerms(
        borrowerAddress,
        loanAmount,
        durationDays
      );
    } finally {
      setIsFetching(false);
    }
  };

  return { preview, isFetching };
}
