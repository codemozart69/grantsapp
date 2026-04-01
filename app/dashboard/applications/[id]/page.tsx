"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { ApplicationStatusBadge } from "@/components/dashboard/applications/application-status-badge";
import { MechanismBadge } from "@/components/dashboard/programs/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconChevronLeft,
    IconFileText,
    IconCheck,
    IconX,
    IconAlertCircle,
    IconExternalLink,
    IconUser,
    IconClock,
    IconCircleCheck,
    IconTarget,
} from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { StatusBanner } from "@/components/dashboard/status-banner";
import { RecordPaymentPanel } from "@/components/dashboard/record-payment-panel";
import { CommentsSection } from "@/components/dashboard/comments-section";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
    });
}

function formatCurrency(amount?: number, currency = "USD") {
    if (amount === undefined || amount === null) return "—";
    const prefix = currency === "USD" || currency === "USDC" ? "$" : "";
    return `${prefix}${amount.toLocaleString()}${prefix ? "" : ` ${currency}`}`;
}

// ─── Section Block ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </div>
            {children}
        </div>
    );
}

// ─── Milestone Row ────────────────────────────────────────────────────────────

const MILESTONE_STATUS_STYLE: Record<string, string> = {
    pending: "text-muted-foreground",
    in_progress: "text-amber-600 dark:text-amber-400",
    submitted: "text-blue-600 dark:text-blue-400",
    approved: "text-emerald-600 dark:text-emerald-400",
    rejected: "text-destructive",
    revision_requested: "text-orange-600 dark:text-orange-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MilestoneRow({ milestone, index }: { milestone: any; index: number }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground mt-0.5">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <div className="text-xs font-medium">{milestone.title}</div>
                    <span className={cn("text-[10px] font-medium capitalize", MILESTONE_STATUS_STYLE[milestone.status])}>
                        {milestone.status.replace("_", " ")}
                    </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                    {milestone.description}
                </div>
                {milestone.amount && (
                    <div className="mt-1 text-[11px] font-medium text-primary">
                        {formatCurrency(milestone.amount)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Manager Review Panel ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ManagerReviewPanel({ application }: { application: any }) {
    const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
    const [reviewNotes, setReviewNotes] = useState(application.reviewNotes ?? "");
    const [approvedAmount, setApprovedAmount] = useState(
        application.approvedAmount?.toString() ?? application.requestedAmount?.toString() ?? ""
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewMutation = useMutation((api as any).applications.review);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startReviewMutation = useMutation((api as any).applications.startReview);

    const alreadyReviewed = ["approved", "rejected"].includes(application.status);
    const canReview = ["submitted", "under_review"].includes(application.status);

    const handleStartReview = async () => {
        if (application.status !== "submitted") return;
        try {
            await startReviewMutation({ applicationId: application._id });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to start review.");
        }
    };

    const handleSubmitReview = async () => {
        if (!decision) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await reviewMutation({
                applicationId: application._id,
                decision,
                reviewNotes: reviewNotes.trim() || undefined,
                approvedAmount: approvedAmount ? parseFloat(approvedAmount) : undefined,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (alreadyReviewed) {
        return (
            <div className={cn(
                "rounded-xl border p-5 space-y-3",
                application.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-destructive/20 bg-destructive/5"
            )}>
                <div className="flex items-center gap-2">
                    {application.status === "approved"
                        ? <IconCircleCheck size={16} stroke={2} className="text-emerald-600 dark:text-emerald-400" />
                        : <IconX size={16} stroke={2} className="text-destructive" />}
                    <div className="text-sm font-semibold">
                        {application.status === "approved" ? "Application Approved" : "Application Rejected"}
                    </div>
                </div>
                {application.approvedAmount && (
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Approved amount: {formatCurrency(application.approvedAmount, application.program?.currency)}
                    </div>
                )}
                {application.reviewNotes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{application.reviewNotes}</p>
                )}
                {application.reviewer && (
                    <div className="text-[11px] text-muted-foreground">
                        Reviewed by @{application.reviewer.username} · {formatDate(application.reviewedAt)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm font-semibold">Review Application</div>

            {application.status === "submitted" && (
                <Button size="sm" variant="outline" className="w-full" onClick={handleStartReview}>
                    Mark as Under Review
                </Button>
            )}

            {canReview && (
                <>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setDecision("approved")}
                            className={cn(
                                "flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all cursor-pointer",
                                decision === "approved"
                                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    : "border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
                            )}
                        >
                            <IconCheck size={13} stroke={2.5} />
                            Approve
                        </button>
                        <button
                            onClick={() => setDecision("rejected")}
                            className={cn(
                                "flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all cursor-pointer",
                                decision === "rejected"
                                    ? "border-destructive/50 bg-destructive/5 text-destructive"
                                    : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                            )}
                        >
                            <IconX size={13} stroke={2.5} />
                            Reject
                        </button>
                    </div>

                    {decision === "approved" && (
                        <Field>
                            <FieldLabel>Approved Amount</FieldLabel>
                            <FieldDescription>Leave blank to match requested amount.</FieldDescription>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                                    {application.program?.currency ?? "USD"}
                                </span>
                                <Input
                                    type="number"
                                    className="pl-12"
                                    placeholder={application.requestedAmount?.toString() ?? "0"}
                                    value={approvedAmount}
                                    onChange={(e) => setApprovedAmount(e.target.value)}
                                    min="0"
                                />
                            </div>
                        </Field>
                    )}

                    <Field>
                        <FieldLabel>Review Notes</FieldLabel>
                        <FieldDescription>Feedback for the applicant (optional but recommended).</FieldDescription>
                        <Textarea
                            placeholder={
                                decision === "approved"
                                    ? "Congratulations! We're excited to fund..."
                                    : decision === "rejected"
                                        ? "Thank you for applying. Unfortunately..."
                                        : "Add feedback for the applicant..."
                            }
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="min-h-20 resize-none"
                        />
                    </Field>

                    {error && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
                    )}

                    <Button
                        size="sm"
                        className="w-full"
                        onClick={handleSubmitReview}
                        disabled={!decision || isSubmitting}
                        variant={decision === "rejected" ? "destructive" : "default"}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-1.5">
                                <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                Submitting...
                            </span>
                        ) : decision === "approved" ? "Approve Application" : decision === "rejected" ? "Reject Application" : "Select a Decision"}
                    </Button>
                </>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { isAuthenticated } = useConvexAuth();

    const currentUser = useQuery(
        api.users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const application = useQuery((api as any).applications.getById, {
        applicationId: id as Id<"applications">,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withdrawMutation = useMutation((api as any).applications.withdraw);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

    const handleWithdraw = async () => {
        setIsWithdrawing(true);
        try {
            await withdrawMutation({ applicationId: id as Id<"applications"> });
            setShowWithdrawConfirm(false);
        } catch {
            /* noop */
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (application === undefined || currentUser === undefined) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-4 w-28" />
                <div className="grid grid-cols-[1fr_320px] gap-6">
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (application === null) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={IconFileText}
                    title="Application not found"
                    description="This application doesn't exist or you don't have access to it."
                    action={{ label: "Back to Applications", href: "/dashboard/applications" }}
                />
            </div>
        );
    }

    const isManager = currentUser?.activeRole === "manager";
    const isOwner = application.applicantId === currentUser?._id;
    const canWithdraw = isOwner && ["submitted", "under_review"].includes(application.status);

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Breadcrumb */}
            <Link
                href="/dashboard/applications"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
            >
                <IconChevronLeft size={13} stroke={2.5} />
                Applications
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <ApplicationStatusBadge status={application.status} showDot />
                        {application.program && <MechanismBadge mechanism={application.program.mechanism} />}
                    </div>
                    <h1 className="text-xl font-semibold leading-tight">{application.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {application.program && (
                            <Link href={`/grants/${application.program.slug}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                {application.program.name}
                                <IconExternalLink size={11} stroke={2} />
                            </Link>
                        )}
                        {application.submittedAt && (
                            <span className="flex items-center gap-1">
                                <IconClock size={11} stroke={2} />
                                Submitted {formatDate(application.submittedAt)}
                            </span>
                        )}
                        {/* Applicant username — links to builder profile in manager view */}
                        {isManager && application.applicant && (
                            <Link
                                href={`/builders/${application.applicant.username}`}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                                <IconUser size={11} stroke={2} />
                                @{application.applicant.username}
                            </Link>
                        )}
                    </div>
                </div>

                {canWithdraw && !isManager && (
                    <div className="shrink-0">
                        {showWithdrawConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Withdraw?</span>
                                <Button variant="outline" size="sm" onClick={() => setShowWithdrawConfirm(false)} disabled={isWithdrawing}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleWithdraw} disabled={isWithdrawing}>
                                    {isWithdrawing ? "Withdrawing..." : "Confirm"}
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => setShowWithdrawConfirm(true)}>
                                Withdraw
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Status Banner */}
            <StatusBanner
                status={application.status}
                paymentStatus={application.paymentStatus}
                paymentTxHash={application.paymentTxHash}
                paymentAmount={application.paymentAmount}
                paymentCurrency={application.paymentCurrency ?? application.program?.currency}
                paidAt={application.paidAt}
                isManager={isManager}
                type="application"
            />

            {/* Main content grid */}
            <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
                {/* Left column */}
                <div className="flex flex-col gap-5">
                    <div className="rounded-xl border bg-card p-5">
                        <Section title="Project Description">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {application.description}
                            </p>
                        </Section>
                    </div>

                    <div className="rounded-xl border bg-card p-5 space-y-5">
                        {application.requestedAmount && (
                            <Section title="Requested Amount">
                                <div className="text-sm font-semibold">
                                    {formatCurrency(application.requestedAmount, application.program?.currency)}
                                </div>
                            </Section>
                        )}

                        {application.proposedTimeline && (
                            <Section title="Proposed Timeline">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                    {application.proposedTimeline}
                                </p>
                            </Section>
                        )}

                        {application.teamDescription && (
                            <Section title="Team">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                    {application.teamDescription}
                                </p>
                            </Section>
                        )}

                        {application.relevantLinks && application.relevantLinks.length > 0 && (
                            <Section title="Relevant Links">
                                <div className="flex flex-col gap-1.5">
                                    {application.relevantLinks.map((link: string, i: number) => (
                                        <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                        >
                                            <IconExternalLink size={11} stroke={2} />
                                            {link}
                                        </a>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>

                    {application.customAnswers && application.customAnswers.length > 0 && application.program?.customQuestions && (
                        <div className="rounded-xl border bg-card p-5 space-y-5">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {application.customAnswers.map((answerObj: any) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const questionDef = application.program.customQuestions.find((q: any) => q.id === answerObj.questionId);
                                if (!questionDef) return null;
                                return (
                                    <Section key={answerObj.questionId} title={questionDef.question}>
                                        {questionDef.type === "link" ? (
                                            <a
                                                href={answerObj.answer}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                                            >
                                                <IconExternalLink size={14} stroke={2} />
                                                {answerObj.answer}
                                            </a>
                                        ) : (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                                {answerObj.answer}
                                            </p>
                                        )}
                                    </Section>
                                );
                            })}
                        </div>
                    )}

                    {application.project && (
                        <div className="rounded-xl border bg-card p-5">
                            <Section title="Project">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                                        <IconFileText size={14} stroke={2} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{application.project.name}</div>
                                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                                            {application.project.description}
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        </div>
                    )}

                    {application.milestones && application.milestones.length > 0 && (
                        <div className="rounded-xl border bg-card p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <IconTarget size={14} stroke={2} className="text-muted-foreground" />
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Milestones ({application.milestones.length})
                                </div>
                            </div>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {application.milestones.map((m: any, i: number) => (
                                <MilestoneRow key={m._id} milestone={m} index={i} />
                            ))}
                        </div>
                    )}

                    {!isManager && application.reviewNotes && (
                        <div className={cn(
                            "rounded-xl border p-5 space-y-2",
                            application.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                : "border-destructive/20 bg-destructive/5"
                        )}>
                            <div className="flex items-center gap-2">
                                <IconAlertCircle size={14} stroke={2} className={application.status === "approved" ? "text-emerald-600" : "text-destructive"} />
                                <div className="text-xs font-semibold">
                                    {application.status === "approved" ? "Reviewer Feedback" : "Review Decision"}
                                </div>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {application.reviewNotes}
                            </p>
                            {application.approvedAmount && (
                                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    Approved amount: {formatCurrency(application.approvedAmount, application.program?.currency)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments */}
                    <CommentsSection
                        targetType="application"
                        targetId={application._id}
                        isOrgMember={isManager}
                    />
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    {isManager ? (
                        <>
                            <ManagerReviewPanel application={application} />
                            <RecordPaymentPanel
                                targetType="application"
                                targetId={application._id}
                                status={application.status}
                                paymentStatus={application.paymentStatus}
                                suggestedAmount={application.approvedAmount ?? application.requestedAmount}
                                currency={application.program?.currency ?? "USD"}
                                vaultAddress={application.program?.vaultAddress}
                                applicantWalletAddress={application.applicant?.walletAddress}
                            />
                        </>
                    ) : (
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <div className="text-sm font-semibold">Status</div>
                            <div className="space-y-2">
                                {[
                                    { status: "draft", label: "Draft created", done: true },
                                    { status: "submitted", label: "Submitted", done: application.submittedAt !== undefined },
                                    { status: "under_review", label: "Under review", done: ["under_review", "approved", "rejected"].includes(application.status) },
                                    { status: "approved", label: application.status === "rejected" ? "Rejected" : "Decision", done: ["approved", "rejected"].includes(application.status) },
                                ].map(({ label, done }, i) => (
                                    <div key={i} className="flex items-center gap-2.5">
                                        <div className={cn(
                                            "flex size-4 shrink-0 items-center justify-center rounded-full",
                                            done ? "bg-primary text-primary-foreground" : "border border-border"
                                        )}>
                                            {done && <IconCheck size={9} stroke={3} />}
                                        </div>
                                        <span className={cn("text-xs", done ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium">{formatDate(application.createdAt)}</span>
                        </div>
                        {application.submittedAt && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Submitted</span>
                                <span className="font-medium">{formatDate(application.submittedAt)}</span>
                            </div>
                        )}
                        {application.requestedAmount && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Requested</span>
                                <span className="font-medium">{formatCurrency(application.requestedAmount, application.program?.currency)}</span>
                            </div>
                        )}
                        {application.approvedAmount && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Approved</span>
                                <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(application.approvedAmount, application.program?.currency)}</span>
                            </div>
                        )}
                        {/* Applicant info in manager meta panel — links to builder profile */}
                        {isManager && application.applicant && (
                            <div className="flex justify-between text-[11px] pt-1 border-t mt-1">
                                <span className="text-muted-foreground">Applicant</span>
                                <Link
                                    href={`/builders/${application.applicant.username}`}
                                    className="font-medium text-primary hover:underline"
                                >
                                    @{application.applicant.username}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}