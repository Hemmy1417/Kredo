"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Coins, Clock, ShieldCheck } from "lucide-react";
import { useRequestLoan, usePreviewLoanTerms } from "@/lib/hooks/useKredo";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
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

export function RequestLoanModal() {
  const { isConnected, address, isLoading } = useWallet();
  const { requestLoan, isRequesting, isSuccess } = useRequestLoan();
  const { preview, isFetching: isPreviewLoading } = usePreviewLoanTerms();

  const [isOpen, setIsOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);

  const [errors, setErrors] = useState({
    loanAmount: "",
    collateralAmount: "",
    durationDays: "",
  });

  // Auto-close when wallet disconnects (unless tx in progress)
  useEffect(() => {
    if (!isConnected && isOpen && !isRequesting) {
      setIsOpen(false);
    }
  }, [isConnected, isOpen, isRequesting]);

  // Live preview whenever amount + duration are filled
  useEffect(() => {
    const amount = parseInt(loanAmount);
    const days = parseInt(durationDays);
    if (!address || !amount || !days || amount <= 0 || days <= 0) {
      setPreviewData(null);
      return;
    }
    preview({ borrowerAddress: address, loanAmount: amount, durationDays: days })
      .then(setPreviewData)
      .catch(() => setPreviewData(null));
  }, [loanAmount, durationDays, address]);

  const validateForm = (): boolean => {
    const newErrors = { loanAmount: "", collateralAmount: "", durationDays: "" };

    if (!loanAmount || parseInt(loanAmount) <= 0)
      newErrors.loanAmount = "Enter a valid loan amount";

    if (!collateralAmount || parseInt(collateralAmount) <= 0)
      newErrors.collateralAmount = "Enter a valid collateral amount";

    if (!durationDays || parseInt(durationDays) <= 0)
      newErrors.durationDays = "Enter a valid duration in days";

    setErrors(newErrors);
    return !Object.values(newErrors).some((e) => e !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      error("Please connect your wallet first");
      return;
    }

    if (!validateForm()) return;

    requestLoan({
      borrowerAddress: address,
      loanAmount: parseInt(loanAmount),
      collateralAmount: parseInt(collateralAmount),
      durationDays: parseInt(durationDays),
    });
  };

  const resetForm = () => {
    setLoanAmount("");
    setCollateralAmount("");
    setDurationDays("");
    setPreviewData(null);
    setErrors({ loanAmount: "", collateralAmount: "", durationDays: "" });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isRequesting) resetForm();
    setIsOpen(open);
  };

  // Close on success
  useEffect(() => {
    if (isSuccess) {
      resetForm();
      setIsOpen(false);
    }
  }, [isSuccess]);

  // Auto-fill collateral from preview
  useEffect(() => {
    if (previewData?.required_collateral) {
      setCollateralAmount(String(previewData.required_collateral));
    }
  }, [previewData]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="gradient"
          disabled={!isConnected || !address || isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Request a Loan</DialogTitle>
          <DialogDescription>
            Your reputation score determines your collateral ratio and interest rate
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Loan Amount */}
          <div className="space-y-2">
            <Label htmlFor="loanAmount" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Loan Amount
            </Label>
            <Input
              id="loanAmount"
              type="number"
              min="1"
              placeholder="e.g. 1000"
              value={loanAmount}
              onChange={(e) => {
                setLoanAmount(e.target.value);
                setErrors({ ...errors, loanAmount: "" });
              }}
              className={errors.loanAmount ? "border-destructive" : ""}
            />
            {errors.loanAmount && (
              <p className="text-xs text-destructive">{errors.loanAmount}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationDays" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration (days)
            </Label>
            <Input
              id="durationDays"
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={durationDays}
              onChange={(e) => {
                setDurationDays(e.target.value);
                setErrors({ ...errors, durationDays: "" });
              }}
              className={errors.durationDays ? "border-destructive" : ""}
            />
            {errors.durationDays && (
              <p className="text-xs text-destructive">{errors.durationDays}</p>
            )}
          </div>

          {/* Live Preview Panel */}
          {(isPreviewLoading || previewData) && (
            <div className="brand-card p-4 space-y-3 border border-accent/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                Loan Preview
              </p>
              {isPreviewLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calculating terms...
                </div>
              ) : previewData ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Rep score</p>
                    <p className="font-semibold text-accent">
                      {previewData.reputation_score ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Collateral ratio</p>
                    <p className="font-semibold">
                      {previewData.collateral_ratio != null
                        ? `${(previewData.collateral_ratio * 100).toFixed(0)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">APR</p>
                    <p className="font-semibold">
                      {previewData.interest_rate_apr != null
                        ? `${(previewData.interest_rate_apr * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total repayment</p>
                    <p className="font-semibold">
                      {previewData.repayment_amount?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Required collateral
                    </p>
                    <p className="font-semibold text-accent">
                      {previewData.required_collateral?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  {!previewData.eligible && (
                    <div className="col-span-2">
                      <p className="text-xs text-destructive">
                        Your reputation score is too low to borrow. Verify your
                        identity first.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Collateral Amount */}
          <div className="space-y-2">
            <Label htmlFor="collateralAmount" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Collateral Amount
              {previewData?.required_collateral && (
                <span className="text-xs text-muted-foreground ml-auto">
                  min {previewData.required_collateral.toLocaleString()}
                </span>
              )}
            </Label>
            <Input
              id="collateralAmount"
              type="number"
              min="1"
              placeholder="e.g. 800"
              value={collateralAmount}
              onChange={(e) => {
                setCollateralAmount(e.target.value);
                setErrors({ ...errors, collateralAmount: "" });
              }}
              className={errors.collateralAmount ? "border-destructive" : ""}
            />
            {errors.collateralAmount && (
              <p className="text-xs text-destructive">{errors.collateralAmount}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              disabled={isRequesting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={isRequesting || previewData?.eligible === false}
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Request Loan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}