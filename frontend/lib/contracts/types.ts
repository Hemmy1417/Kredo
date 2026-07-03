/**
 * TypeScript types for GenLayer Identity Lending contract
 */

export interface Loan {
  loan_id: string;
  borrower: string;
  loan_amount: number;
  collateral_amount: number;
  collateral_ratio: number;
  interest_rate_apr: number;
  interest_amount: number;
  repayment_amount: number;
  duration_days: number;
  reputation_score_at_origination: number;
  status: "ACTIVE" | "REPAID" | "LIQUIDATED";
  created_at: string;
}

export interface ReputationProfile {
  address: string;
  score: number;
  risk_tier: "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW" | "UNVERIFIED";
  identity_sources: string[];
  last_updated: string;
  total_loans_repaid: number;
  total_loans_defaulted: number;
  verified: boolean;
  collateral_ratio: number;
  interest_rate_apr: number;
}

export interface IdentitySource {
  type: "ens" | "gitcoin_passport" | "onchain_history" | "credit_api";
  url: string;
  label: string;
}

export interface LoanPreview {
  borrower: string;
  reputation_score: number;
  loan_amount: number;
  required_collateral: number;
  collateral_ratio: number;
  interest_rate_apr: number;
  interest_amount: number;
  repayment_amount: number;
  duration_days: number;
  eligible: boolean;
}

export interface ProtocolParams {
  owner: string;
  min_reputation_to_borrow: number;
  total_loans_issued: number;
}

export interface TopBorrowerEntry {
  address: string;
  score: number;
  total_loans_repaid: number;
  total_loans_defaulted: number;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}

export interface LoanFilters {
  status?: "ACTIVE" | "REPAID" | "LIQUIDATED";
  borrower?: string;
}