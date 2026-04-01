"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
    IconCurrencyDollar,
    IconExternalLink,
    IconChevronDown,
    IconCheck,
    IconWallet,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useRegisterGrant, useReleaseMilestone } from "@/lib/hooks/use-fvm";
import { parseEther } from "viem";

// ─── Types ──────────────────────────────────────────────────────────────────

type PaymentTargetType = "application" | "milestone";

interface RecordPaymentPanelProps {
    targetType: PaymentTargetType;
    targetId: string;
    applicationId?: string; // Passed when target is milestone to link to the Grant ID
    status: string;
    paymentStatus?: string | null;
    suggestedAmount?: number | null;
    currency?: string;
    vaultAddress?: string;
    applicantWalletAddress?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecordPaymentPanel({
    targetType,
    targetId,
    applicationId,
    status,
    paymentStatus,
    suggestedAmount,
    currency = "USD",
    vaultAddress,
    applicantWalletAddress,
}: RecordPaymentPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [method, setMethod] = useState<"manual" | "external_link" | "fvm_contract">("manual");
    const [amount, setAmount] = useState(suggestedAmount?.toString() ?? "");
    const [paymentCurrency, setPaymentCurrency] = useState(currency);
    const [txHash, setTxHash] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordApplicationPayment = useMutation((api as any).applications.recordPayment);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordMilestonePayment = useMutation((api as any).milestones.recordPayment);

    // FVM Hooks
    const { registerGrant, isRegistering, isConfirmed: isRegConfirmed, receipt: regReceipt, error: regError } = useRegisterGrant();
    const { releaseMilestone, isReleasing, isConfirmed: isRelConfirmed, receipt: relReceipt, error: relError } = useReleaseMilestone();

    // Effect to automatically save to Convex after successful on-chain tx
    useEffect(() => {
        if ((isRegConfirmed && targetType === "application") || (isRelConfirmed && targetType === "milestone")) {
            const hash = (targetType === "application" ? regReceipt?.transactionHash : relReceipt?.transactionHash) || "";
            handleConvexSave(hash);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegConfirmed, isRelConfirmed, regReceipt, relReceipt]);

    // Only show if approved + unpaid
    if (status !== "approved" || paymentStatus === "paid") return null;

    const handleConvexSave = async (resolvedTxHash: string) => {
        setIsSubmitting(true);
        try {
            const payload = {
                paymentMethod: method,
                paymentAmount: parseFloat(amount),
                paymentCurrency,
                paymentTxHash: resolvedTxHash.trim() || undefined,
            };

            if (targetType === "application") {
                await recordApplicationPayment({
                    applicationId: targetId as Id<"applications">,
                    ...payload,
                });
            } else {
                await recordMilestonePayment({
                    milestoneId: targetId as Id<"milestones">,
                    ...payload,
                });
            }
            setSuccess(true);
            setIsOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to record payment in database.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid payment amount.");
            return;
        }

        setError(null);

        // Web3 Flow
        if (method === "fvm_contract") {
            if (!vaultAddress) {
                setError("No Vault Deployed for this program.");
                return;
            }
            if (!applicantWalletAddress) {
                setError("Applicant has not connected a web3 wallet.");
                return;
            }

            try {
                if (targetType === "application") {
                    // Register a direct grant (1 single milestone equal to approved amount)
                    const isNative = paymentCurrency === "FIL";
                    const tokenAddr = "0x0000000000000000000000000000000000000000"; // Assume native FIL for now
                    const parsedAmount = parseEther(amount.toString());

                    await registerGrant(
                        vaultAddress as `0x${string}`,
                        targetId, // application ID acts as global grant ID
                        applicantWalletAddress as `0x${string}`,
                        [parsedAmount],
                        [isNative],
                        [tokenAddr]
                    );
                    // Hook useEffect will catch success and fire Convex save
                } else if (targetType === "milestone") {
                    if (!applicationId) throw new Error("Missing Application ID linking to this milestone");
                    await releaseMilestone(vaultAddress as `0x${string}`, applicationId);
                    // Hook useEffect will catch success and fire Convex save
                }
            } catch (err: any) {
                setError(err.shortMessage || err.message || "Blockchain transaction failed");
            }
            return;
        }

        // Manual Flow
        await handleConvexSave(txHash);
    };

    if (success) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <IconCheck size={14} stroke={2.5} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Payment recorded successfully!
                </span>
            </div>
        );
    }

    const isFvmLoading = isRegistering || isReleasing;

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Toggle header */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/30"
            >
                <div className="flex items-center gap-2">
                    <IconCurrencyDollar size={14} stroke={2} className="text-primary" />
                    <span className="text-xs font-semibold">Complete Payment</span>
                </div>
                <IconChevronDown
                    size={13}
                    stroke={2}
                    className={cn(
                        "text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Expanded form */}
            {isOpen && (
                <div className="border-t px-5 pb-5 pt-4 space-y-4">
                    {/* Method selector */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setMethod("fvm_contract")}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[11px] font-medium transition-all cursor-pointer",
                                method === "fvm_contract"
                                    ? "border-primary/40 bg-primary/5 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/20"
                            )}
                        >
                            <IconWallet size={14} stroke={2} />
                            FVM Contract
                        </button>
                        <button
                            onClick={() => setMethod("manual")}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[11px] font-medium transition-all cursor-pointer",
                                method === "manual"
                                    ? "border-primary/40 bg-primary/5 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/20"
                            )}
                        >
                            <IconCurrencyDollar size={14} stroke={2} />
                            Manual Record
                        </button>
                        <button
                            onClick={() => setMethod("external_link")}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[11px] font-medium transition-all cursor-pointer",
                                method === "external_link"
                                    ? "border-primary/40 bg-primary/5 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/20"
                            )}
                        >
                            <IconExternalLink size={14} stroke={2} />
                            Paste Tx Hash
                        </button>
                    </div>

                    <FieldGroup>
                        <div className="grid grid-cols-2 gap-3">
                            <Field>
                                <FieldLabel>Amount <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    type="number"
                                    placeholder="10000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    disabled={method === "fvm_contract" && targetType === "milestone"} // Readonly for milestone execution since it relies on registry
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Currency</FieldLabel>
                                <select
                                    value={paymentCurrency}
                                    onChange={(e) => setPaymentCurrency(e.target.value)}
                                    disabled={method === "fvm_contract"} // Force preset for FVM MVP
                                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="FIL">FIL</option>
                                    <option value="USD">USD</option>
                                    <option value="USDC">USDC</option>
                                </select>
                            </Field>
                        </div>

                        {method === "external_link" && (
                            <Field>
                                <FieldLabel>Transaction Hash</FieldLabel>
                                <FieldDescription>Paste the on-chain transaction hash or ID.</FieldDescription>
                                <Input
                                    placeholder="0x..."
                                    value={txHash}
                                    onChange={(e) => setTxHash(e.target.value)}
                                    className="font-mono text-xs"
                                />
                            </Field>
                        )}

                        {method === "manual" && (
                            <Field>
                                <FieldLabel>Reference / Note</FieldLabel>
                                <FieldDescription>Optional bank reference or payment note.</FieldDescription>
                                <Input
                                    placeholder="Wire transfer ref #..."
                                    value={txHash}
                                    onChange={(e) => setTxHash(e.target.value)}
                                />
                            </Field>
                        )}
                    </FieldGroup>

                    {(error || regError || relError) && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error || regError?.message || relError?.message}
                        </div>
                    )}

                    <Button
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isFvmLoading || !amount}
                    >
                        {isSubmitting || isFvmLoading ? (
                            <span className="flex items-center gap-1.5">
                                <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                {method === "fvm_contract" ? "Processing on Web3..." : "Recording..."}
                            </span>
                        ) : (
                            <>
                                {method === "fvm_contract" ? <IconWallet size={12} stroke={2.5} /> : <IconCheck size={12} stroke={2.5} />}
                                {method === "fvm_contract" 
                                    ? (targetType === "application" ? "Register & Lock Funds" : "Disburse Milestone") 
                                    : "Record Payment"}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
