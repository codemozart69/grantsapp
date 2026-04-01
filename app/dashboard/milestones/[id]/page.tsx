"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconChevronLeft,
    IconTarget,
    IconCheck,
    IconX,
    IconRefresh,
    IconExternalLink,
    IconPlayerPlay,
    IconSend,
    IconCircleCheck,
    IconAlertCircle,
    IconClock,
    IconUser,
    IconCalendar,
    IconPlus,
    IconTrash,
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
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatCurrency(amount?: number) {
    if (!amount) return null;
    return `$${amount.toLocaleString()}`;
}

function daysUntil(ts?: number): { label: string; urgent: boolean } | null {
    if (!ts) return null;
    const days = Math.ceil((ts - Date.now()) / 86_400_000);
    if (days < 0) return { label: "Overdue", urgent: true };
    if (days === 0) return { label: "Due today", urgent: true };
    if (days === 1) return { label: "Due tomorrow", urgent: true };
    if (days <= 7) return { label: `Due in ${days}d`, urgent: true };
    return { label: formatDate(ts), urgent: false };
}

// ─── Status config ────────────────────────────────────────────────────────────

type MilestoneStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "revision_requested";

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; badgeClass: string; dot: string }> = {
    pending: { label: "Pending", badgeClass: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
    in_progress: { label: "In Progress", badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    submitted: { label: "Submitted for Review", badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    approved: { label: "Approved", badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    rejected: { label: "Rejected", badgeClass: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    revision_requested: { label: "Revision Requested", badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
};

// ─── Section block ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
            {children}
        </div>
    );
}

// ─── Builder submission panel ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BuilderActionPanel({ milestone }: { milestone: any }) {
    const [submissionNotes, setSubmissionNotes] = useState(milestone.submissionNotes ?? "");
    const [links, setLinks] = useState<string[]>(milestone.submissionLinks ?? [""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startProgressMutation = useMutation((api as any).milestones.startProgress);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitMutation = useMutation((api as any).milestones.submit);

    const handleStartProgress = async () => {
        setIsStarting(true);
        setError(null);
        try {
            await startProgressMutation({ milestoneId: milestone._id });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to start.");
        } finally {
            setIsStarting(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
            await submitMutation({
                milestoneId: milestone._id,
                submissionNotes: submissionNotes.trim() || undefined,
                submissionLinks: cleanLinks.length ? cleanLinks : undefined,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to submit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = milestone.status === "in_progress" || milestone.status === "pending" || milestone.status === "revision_requested";
    const isAlreadySubmitted = milestone.status === "submitted";
    const isDone = ["approved", "rejected"].includes(milestone.status);

    if (isDone) {
        return (
            <div className={cn(
                "rounded-xl border p-5 space-y-3",
                milestone.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-destructive/20 bg-destructive/5"
            )}>
                <div className="flex items-center gap-2">
                    {milestone.status === "approved"
                        ? <IconCircleCheck size={16} stroke={2} className="text-emerald-600 dark:text-emerald-400" />
                        : <IconX size={16} stroke={2} className="text-destructive" />}
                    <div className="text-sm font-semibold">
                        {milestone.status === "approved" ? "Milestone Approved" : "Milestone Rejected"}
                    </div>
                </div>
                {milestone.amount && milestone.status === "approved" && (
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Payment: {formatCurrency(milestone.amount)}
                    </div>
                )}
                {milestone.reviewNotes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.reviewNotes}</p>
                )}
                {milestone.reviewer && (
                    <div className="text-[11px] text-muted-foreground">
                        Reviewed by @{milestone.reviewer.username} · {formatDate(milestone.reviewedAt)}
                    </div>
                )}
            </div>
        );
    }

    if (isAlreadySubmitted) {
        return (
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 p-5 space-y-2">
                <div className="flex items-center gap-2">
                    <IconSend size={14} stroke={2} className="text-blue-600 dark:text-blue-400" />
                    <div className="text-sm font-semibold">Submitted for Review</div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Your deliverables are being reviewed. You&apos;ll be notified when a decision is made.
                </p>
                <div className="text-[11px] text-muted-foreground">
                    Submitted {formatDate(milestone.submittedAt)}
                </div>
            </div>
        );
    }

    if (milestone.status === "revision_requested") {
        return (
            <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="rounded-lg bg-orange-500/10 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400">
                        <IconRefresh size={13} stroke={2} />
                        Revision requested
                    </div>
                    {milestone.reviewNotes && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{milestone.reviewNotes}</p>
                    )}
                </div>
                <SubmissionForm
                    notes={submissionNotes}
                    setNotes={setSubmissionNotes}
                    links={links}
                    setLinks={setLinks}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    error={error}
                    label="Resubmit Milestone"
                />
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm font-semibold">Submit Deliverables</div>

            {milestone.status === "pending" && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={handleStartProgress}
                    disabled={isStarting}
                >
                    <IconPlayerPlay size={12} stroke={2.5} />
                    {isStarting ? "Starting..." : "Mark as In Progress"}
                </Button>
            )}

            {canSubmit && (
                <SubmissionForm
                    notes={submissionNotes}
                    setNotes={setSubmissionNotes}
                    links={links}
                    setLinks={setLinks}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    error={error}
                    label="Submit for Review"
                />
            )}
        </div>
    );
}

function SubmissionForm({
    notes, setNotes, links, setLinks, onSubmit, isSubmitting, error, label,
}: {
    notes: string;
    setNotes: (v: string) => void;
    links: string[];
    setLinks: (v: string[]) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    error: string | null;
    label: string;
}) {
    const addLink = () => setLinks([...links, ""]);
    const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
    const setLink = (i: number, v: string) => {
        const next = [...links];
        next[i] = v;
        setLinks(next);
    };

    return (
        <div className="space-y-4">
            <Field>
                <FieldLabel>Submission Notes</FieldLabel>
                <FieldDescription>Describe what you built and how it meets the milestone criteria.</FieldDescription>
                <Textarea
                    placeholder="Completed the smart contract implementation. Deployed to testnet at 0x... All tests passing."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-24 resize-none"
                />
            </Field>

            <Field>
                <FieldLabel>Deliverable Links</FieldLabel>
                <FieldDescription>GitHub repos, deployed contracts, demo videos, documentation.</FieldDescription>
                <div className="space-y-2">
                    {links.map((link, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Input
                                placeholder="https://github.com/..."
                                value={link}
                                onChange={(e) => setLink(i, e.target.value)}
                                className="font-mono text-xs"
                            />
                            {links.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeLink(i)}
                                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    <IconTrash size={13} stroke={2} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addLink}
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                    >
                        <IconPlus size={11} stroke={2.5} />
                        Add another link
                    </button>
                </div>
            </Field>

            {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
            )}

            <Button size="sm" className="w-full gap-1.5" onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                        <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                        Submitting...
                    </span>
                ) : (
                    <>
                        <IconSend size={12} stroke={2.5} />
                        {label}
                    </>
                )}
            </Button>
        </div>
    );
}

// ─── Manager review panel ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ManagerReviewPanel({ milestone }: { milestone: any }) {
    const [decision, setDecision] = useState<"approved" | "rejected" | "revision_requested" | null>(null);
    const [reviewNotes, setReviewNotes] = useState(milestone.reviewNotes ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewMutation = useMutation((api as any).milestones.review);

    const alreadyReviewed = ["approved", "rejected"].includes(milestone.status);
    const canReview = milestone.status === "submitted";

    const handleSubmit = async () => {
        if (!decision) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await reviewMutation({
                milestoneId: milestone._id,
                decision,
                reviewNotes: reviewNotes.trim() || undefined,
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
                milestone.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-destructive/20 bg-destructive/5"
            )}>
                <div className="flex items-center gap-2">
                    {milestone.status === "approved"
                        ? <IconCircleCheck size={16} stroke={2} className="text-emerald-600 dark:text-emerald-400" />
                        : <IconX size={16} stroke={2} className="text-destructive" />}
                    <div className="text-sm font-semibold">
                        {milestone.status === "approved" ? "Milestone Approved" : "Milestone Rejected"}
                    </div>
                </div>
                {milestone.reviewNotes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.reviewNotes}</p>
                )}
                {milestone.reviewer && (
                    <div className="text-[11px] text-muted-foreground">
                        Reviewed by @{milestone.reviewer.username} · {formatDate(milestone.reviewedAt)}
                    </div>
                )}
            </div>
        );
    }

    if (milestone.status === "revision_requested") {
        return (
            <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 p-5 space-y-2">
                <div className="flex items-center gap-2">
                    <IconRefresh size={14} stroke={2} className="text-orange-600 dark:text-orange-400" />
                    <div className="text-sm font-semibold">Revision Requested</div>
                </div>
                {milestone.reviewNotes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.reviewNotes}</p>
                )}
                <div className="text-[11px] text-muted-foreground">
                    Waiting for builder to resubmit.
                </div>
            </div>
        );
    }

    if (!canReview) {
        return (
            <div className="rounded-xl border bg-muted/30 p-5 text-center">
                <p className="text-xs text-muted-foreground">
                    Awaiting submission from the builder before review is available.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm font-semibold">Review Deliverables</div>

            {/* Decision buttons */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { value: "approved" as const, icon: IconCheck, label: "Approve", active: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
                    { value: "revision_requested" as const, icon: IconRefresh, label: "Revise", active: "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400" },
                    { value: "rejected" as const, icon: IconX, label: "Reject", active: "border-destructive/50 bg-destructive/5 text-destructive" },
                ].map(({ value, icon: Icon, label, active }) => (
                    <button
                        key={value}
                        onClick={() => setDecision(value)}
                        className={cn(
                            "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all cursor-pointer",
                            decision === value
                                ? active
                                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                    >
                        <Icon size={12} stroke={2.5} />
                        {label}
                    </button>
                ))}
            </div>

            <Field>
                <FieldLabel>Review Notes</FieldLabel>
                <FieldDescription>Feedback for the builder (required for revision/rejection).</FieldDescription>
                <Textarea
                    placeholder={
                        decision === "approved"
                            ? "Great work! All deliverables meet the criteria."
                            : decision === "revision_requested"
                                ? "Please update the documentation and re-link the deployed contract."
                                : "The submission does not meet the milestone criteria because..."
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
                onClick={handleSubmit}
                disabled={!decision || isSubmitting || ((decision === "rejected" || decision === "revision_requested") && !reviewNotes.trim())}
                variant={decision === "rejected" ? "destructive" : "default"}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                        <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                        Submitting...
                    </span>
                ) : decision === "approved"
                    ? "Approve Milestone"
                    : decision === "revision_requested"
                        ? "Request Revision"
                        : decision === "rejected"
                            ? "Reject Milestone"
                            : "Select a Decision"}
            </Button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MilestoneDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { isAuthenticated } = useConvexAuth();

    const currentUser = useQuery(
        api.users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const milestone = useQuery((api as any).milestones.getById, {
        milestoneId: id as Id<"milestones">,
    });

    // ── Loading ──────────────────────────────────────────────────────────────
    if (milestone === undefined || currentUser === undefined) {
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

    if (milestone === null) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={IconTarget}
                    title="Milestone not found"
                    description="This milestone doesn't exist or you don't have access to it."
                    action={{ label: "Back to Milestones", href: "/dashboard/milestones" }}
                />
            </div>
        );
    }

    const isManager = currentUser?.activeRole === "manager";
    const status = milestone.status as MilestoneStatus;
    const config = STATUS_CONFIG[status];
    const due = daysUntil(milestone.dueDate);

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Breadcrumb */}
            <Link
                href="/dashboard/milestones"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
            >
                <IconChevronLeft size={13} stroke={2.5} />
                Milestones
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            config.badgeClass
                        )}>
                            <span className={cn("size-1.5 rounded-full", config.dot)} />
                            {config.label}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-muted/50 border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Milestone {milestone.order}
                        </span>
                    </div>
                    <h1 className="text-xl font-semibold leading-tight">{milestone.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {milestone.program && (
                            <span className="truncate">{milestone.program.name}</span>
                        )}
                        {milestone.application && (
                            <>
                                <span className="opacity-30">·</span>
                                <Link
                                    href={`/dashboard/applications/${milestone.applicationId}`}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                                >
                                    {milestone.application.title}
                                    <IconExternalLink size={11} stroke={2} />
                                </Link>
                            </>
                        )}
                        {isManager && milestone.applicant && (
                            <>
                                <span className="opacity-30">·</span>
                                <span className="flex items-center gap-1">
                                    <IconUser size={11} stroke={2} />
                                    @{milestone.applicant.username}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            <StatusBanner
                status={milestone.status}
                paymentStatus={milestone.paymentStatus}
                paymentTxHash={milestone.paymentTxHash}
                paymentAmount={milestone.paymentAmount}
                paymentCurrency={milestone.paymentCurrency}
                paidAt={milestone.paidAt}
                isManager={isManager}
                type="milestone"
            />

            {/* Main grid */}
            <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
                {/* Left — content */}
                <div className="flex flex-col gap-5">
                    {/* Description */}
                    <div className="rounded-xl border bg-card p-5">
                        <Section title="Description">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {milestone.description}
                            </p>
                        </Section>
                    </div>

                    {/* Deliverables spec */}
                    {milestone.deliverables && (
                        <div className="rounded-xl border bg-card p-5">
                            <Section title="Required Deliverables">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                    {milestone.deliverables}
                                </p>
                            </Section>
                        </div>
                    )}

                    {/* Submission — if submitted or approved */}
                    {(milestone.submissionNotes || (milestone.submissionLinks && milestone.submissionLinks.length > 0)) && (
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Submitted Deliverables
                            </div>

                            {milestone.submissionNotes && (
                                <Section title="Notes">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                        {milestone.submissionNotes}
                                    </p>
                                </Section>
                            )}

                            {milestone.submissionLinks && milestone.submissionLinks.length > 0 && (
                                <Section title="Links">
                                    <div className="flex flex-col gap-1.5">
                                        {milestone.submissionLinks.map((link: string, i: number) => (
                                            <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
                                            >
                                                <IconExternalLink size={11} stroke={2} />
                                                {link}
                                            </a>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {milestone.submittedAt && (
                                <div className="text-[11px] text-muted-foreground">
                                    Submitted {formatDate(milestone.submittedAt)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Review notes (builder view) */}
                    {!isManager && milestone.reviewNotes && milestone.status !== "revision_requested" && (
                        <div className={cn(
                            "rounded-xl border p-5 space-y-2",
                            milestone.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                : "border-destructive/20 bg-destructive/5"
                        )}>
                            <div className="flex items-center gap-2">
                                <IconAlertCircle size={14} stroke={2} className={milestone.status === "approved" ? "text-emerald-600" : "text-destructive"} />
                                <div className="text-xs font-semibold">Reviewer Feedback</div>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">{milestone.reviewNotes}</p>
                        </div>
                    )}

                    {/* Comments */}
                    <CommentsSection
                        targetType="milestone"
                        targetId={milestone._id}
                        isOrgMember={isManager}
                    />
                </div>

                {/* Right — action panel + meta */}
                <div className="flex flex-col gap-4">
                    {/* Action panel */}
                    {isManager
                        ? <>
                            <ManagerReviewPanel milestone={milestone} />
                            <RecordPaymentPanel
                                targetType="milestone"
                                targetId={milestone._id}
                                applicationId={milestone.applicationId}
                                status={milestone.status}
                                paymentStatus={milestone.paymentStatus}
                                suggestedAmount={milestone.amount}
                                currency={milestone.program?.currency ?? "USD"}
                                vaultAddress={milestone.program?.vaultAddress}
                                applicantWalletAddress={milestone.applicant?.walletAddress}
                            />
                          </>
                        : <BuilderActionPanel milestone={milestone} />}

                    {/* Meta */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
                        {milestone.amount && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Payment</span>
                                <span className="font-semibold text-primary">{formatCurrency(milestone.amount)}</span>
                            </div>
                        )}
                        {due && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <IconCalendar size={10} stroke={2} />
                                    Due date
                                </span>
                                <span className={cn(
                                    "font-medium",
                                    due.urgent ? "text-amber-700 dark:text-amber-400" : ""
                                )}>
                                    {due.label}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Order</span>
                            <span className="font-medium">Milestone {milestone.order}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium">{formatDate(milestone.createdAt)}</span>
                        </div>
                        {milestone.submittedAt && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Submitted</span>
                                <span className="font-medium">{formatDate(milestone.submittedAt)}</span>
                            </div>
                        )}
                        {milestone.reviewedAt && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Reviewed</span>
                                <span className="font-medium">{formatDate(milestone.reviewedAt)}</span>
                            </div>
                        )}
                    </div>

                    {/* Status timeline */}
                    <div className="rounded-xl border bg-card p-5 space-y-4">
                        <div className="text-sm font-semibold">Progress</div>
                        <div className="space-y-2">
                            {[
                                { label: "Created", done: true },
                                { label: "In progress", done: ["in_progress", "submitted", "approved", "rejected", "revision_requested"].includes(milestone.status) },
                                { label: "Submitted for review", done: ["submitted", "approved", "rejected", "revision_requested"].includes(milestone.status) },
                                { label: "Decision", done: ["approved", "rejected"].includes(milestone.status) },
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
                </div>
            </div>
        </div>
    );
}