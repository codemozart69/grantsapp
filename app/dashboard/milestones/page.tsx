"use client";

import { useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconTarget,
    IconChevronRight,
    IconClock,
    IconUser,
    IconCircleCheck,
    IconAlertCircle,
    IconRefresh,
    IconPlayerPlay,
    IconSend,
    IconChevronDown,
    IconChevronUp,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneStatus =
    | "pending"
    | "in_progress"
    | "submitted"
    | "approved"
    | "rejected"
    | "revision_requested";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount?: number, currency = "USD") {
    if (!amount) return null;
    const prefix = currency === "USD" || currency === "USDC" ? "$" : "";
    return `${prefix}${amount.toLocaleString()}${prefix ? "" : ` ${currency}`}`;
}

function daysUntil(ts?: number): string | null {
    if (!ts) return null;
    const days = Math.ceil((ts - Date.now()) / 86_400_000);
    if (days < 0) return "Overdue";
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days <= 7) return `Due in ${days}d`;
    return `Due ${formatDate(ts)}`;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; className: string; dot: string; icon: React.ElementType }> = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50", icon: IconClock },
    in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500", icon: IconPlayerPlay },
    submitted: { label: "Submitted", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400", dot: "bg-blue-500", icon: IconSend },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: IconCircleCheck },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", dot: "bg-destructive", icon: IconAlertCircle },
    revision_requested: { label: "Revision Requested", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400", dot: "bg-orange-500", icon: IconRefresh },
};

function MilestoneBadge({ status }: { status: MilestoneStatus }) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            config.className
        )}>
            <span className={cn("size-1.5 rounded-full", config.dot)} />
            {config.label}
        </span>
    );
}

// ─── Manager filter tabs ──────────────────────────────────────────────────────

const MANAGER_FILTERS: { label: string; value: MilestoneStatus | "all" }[] = [
    { label: "Needs Review", value: "submitted" },
    { label: "All", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
];

// ─── Milestone Row (for manager flat list + builder grouped list) ─────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MilestoneRow({ milestone, isManager, compact = false }: { milestone: any; isManager: boolean; compact?: boolean }) {
    const due = daysUntil(milestone.dueDate);
    const isOverdue = due === "Overdue";
    const isDueSoon = due === "Due today" || due === "Due tomorrow" || (due?.includes("Due in") ?? false);

    return (
        <Link href={`/dashboard/milestones/${milestone._id}`}>
            <div className={cn(
                "group flex items-center gap-4 transition-colors hover:bg-muted/30",
                compact
                    ? "px-4 py-3 border-b last:border-b-0"
                    : "border-b px-5 py-4 last:border-b-0"
            )}>
                {/* Order badge */}
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {milestone.order}
                </div>

                {/* Status */}
                <div className="shrink-0">
                    <MilestoneBadge status={milestone.status} />
                </div>

                {/* Main info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="truncate text-sm font-medium">{milestone.title}</div>
                    {!compact && (
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="truncate">{milestone.program?.name ?? "Unknown Program"}</span>
                            {isManager && milestone.applicant && (
                                <>
                                    <span className="opacity-30">·</span>
                                    <Link
                                        href={`/builders/${milestone.applicant.username}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                        <IconUser size={10} stroke={2} />
                                        @{milestone.applicant.username}
                                    </Link>
                                </>
                            )}
                            {milestone.application && (
                                <>
                                    <span className="opacity-30">·</span>
                                    <span className="truncate">{milestone.application.title}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Amount */}
                {milestone.amount && (
                    <div className="shrink-0 text-xs font-semibold text-primary">
                        {formatCurrency(milestone.amount)}
                    </div>
                )}

                {/* Due date */}
                {due && (
                    <div className={cn(
                        "shrink-0 flex items-center gap-1 text-[11px] font-medium",
                        isOverdue ? "text-destructive" : isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                        <IconClock size={11} stroke={2} />
                        {due}
                    </div>
                )}

                <IconChevronRight size={14} stroke={2} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
        </Link>
    );
}

// ─── Grant group (builder view) ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GrantGroup({ application, milestones }: { application: any; milestones: any[] }) {
    const approved = milestones.filter((m) => m.status === "approved").length;
    const total = milestones.length;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    const hasActive = milestones.some((m) => ["in_progress", "submitted", "revision_requested"].includes(m.status));
    // Start expanded only if this grant has active milestones; collapse completed/pending grants
    const [collapsed, setCollapsed] = useState(!hasActive);
    const totalAmount = milestones.reduce((sum, m) => sum + (m.amount ?? 0), 0);
    const earned = milestones
        .filter((m) => m.status === "approved")
        .reduce((sum, m) => sum + (m.amount ?? 0), 0);

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Group header */}
            <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
            >
                {/* Progress ring placeholder — simple bar */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {pct}%
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{application?.title ?? "Grant"}</div>
                        {hasActive && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                Active
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="truncate">{milestones[0]?.program?.name ?? "Unknown Program"}</span>
                        <span className="opacity-30">·</span>
                        <span>{approved}/{total} milestones</span>
                        {totalAmount > 0 && (
                            <>
                                <span className="opacity-30">·</span>
                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {formatCurrency(earned)} / {formatCurrency(totalAmount)}
                                </span>
                            </>
                        )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                <div className="shrink-0 text-muted-foreground">
                    {collapsed
                        ? <IconChevronDown size={14} stroke={2} />
                        : <IconChevronUp size={14} stroke={2} />}
                </div>
            </button>

            {/* Milestone rows */}
            {!collapsed && (
                <div className="border-t">
                    {milestones.map((m) => (
                        <MilestoneRow key={m._id} milestone={m} isManager={false} compact />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Progress strip (builder overview) ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgressStrip({ milestones }: { milestones: any[] }) {
    const total = milestones.length;
    const approved = milestones.filter((m) => m.status === "approved").length;
    const inProgress = milestones.filter((m) => ["in_progress", "submitted", "revision_requested"].includes(m.status)).length;
    const pending = milestones.filter((m) => m.status === "pending").length;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

    return (
        <div className="flex items-center gap-6 rounded-xl border bg-muted/30 px-5 py-3">
            <div className="flex flex-col gap-0.5">
                <div className="text-xs font-semibold">{pct}%</div>
                <div className="text-[10px] text-muted-foreground">Complete</div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" />{approved} approved</span>
                    <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500 inline-block" />{inProgress} active</span>
                    <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-muted-foreground/40 inline-block" />{pending} pending</span>
                </div>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
                <div className="text-xs font-semibold">{total}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
        </div>
    );
}

// ─── Builder view — grouped by grant ─────────────────────────────────────────

function BuilderMilestones() {
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const milestones = useQuery(
        (api as any).milestones.listMine,
        !isAuthenticated ? "skip" : {}
    );

    const isLoading = milestones === undefined;

    // Group by applicationId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped: Record<string, { application: any; milestones: any[] }> = {};
    if (milestones) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const m of milestones) {
            const key = m.applicationId;
            if (!grouped[key]) {
                grouped[key] = { application: m.application, milestones: [] };
            }
            grouped[key].milestones.push(m);
        }
        // Sort milestones within each group by order
        for (const key of Object.keys(grouped)) {
            grouped[key].milestones.sort((a, b) => a.order - b.order);
        }
    }

    // Sort groups: active first (has in_progress/submitted), then by most recent
    const sortedGroups = Object.values(grouped).sort((a, b) => {
        const aActive = a.milestones.some((m) => ["in_progress", "submitted"].includes(m.status));
        const bActive = b.milestones.some((m) => ["in_progress", "submitted"].includes(m.status));
        if (aActive !== bActive) return bActive ? 1 : -1;
        return 0;
    });

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Milestones</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track deliverables and deadlines across your active grants.
                    </p>
                </div>
            </div>

            {/* Progress strip */}
            {milestones && milestones.length > 0 && (
                <ProgressStrip milestones={milestones} />
            )}

            {/* Grouped list */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            ) : sortedGroups.length === 0 ? (
                <div className="rounded-xl border">
                    <div className="p-10">
                        <EmptyState
                            icon={IconTarget}
                            title="No milestones yet"
                            description="Milestones appear here once your grant applications are approved."
                            action={{ label: "Browse Programs", href: "/grants" }}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedGroups.map(({ application, milestones: ms }) => (
                        <GrantGroup
                            key={application?._id ?? ms[0]?.applicationId}
                            application={application}
                            milestones={ms}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Manager view ─────────────────────────────────────────────────────────────

function ManagerMilestones() {
    const [filter, setFilter] = useState<MilestoneStatus | "all">("submitted");
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myOrg = useQuery(
        (api as any).organizations.getMyOrg,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingMilestones = useQuery(
        (api as any).milestones.listPendingReview,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const isLoading = myOrg === undefined || pendingMilestones === undefined;

    const displayed = pendingMilestones
        ? filter === "all"
            ? pendingMilestones
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : pendingMilestones.filter((m: any) => m.status === filter)
        : [];

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Milestones</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review submitted milestone deliverables from your grantees.
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            {pendingMilestones && pendingMilestones.length > 0 && (
                <div className="flex items-center gap-4 rounded-xl border bg-muted/30 px-5 py-3">
                    {[
                        { label: "Awaiting review", value: pendingMilestones.filter((m: any) => m.status === "submitted").length, color: "text-blue-700 dark:text-blue-400" },
                        { label: "Approved", value: pendingMilestones.filter((m: any) => m.status === "approved").length, color: "text-emerald-700 dark:text-emerald-400" },
                        { label: "Revision requested", value: pendingMilestones.filter((m: any) => m.status === "revision_requested").length, color: "text-orange-700 dark:text-orange-400" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                            <div className={cn("text-xs font-semibold", color)}>{value}</div>
                            <div className="text-[10px] text-muted-foreground">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5 w-fit">
                {MANAGER_FILTERS.map(({ label, value }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-100 cursor-pointer",
                            filter === value
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="rounded-xl border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
                            <Skeleton className="size-7 rounded-full" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
            ) : displayed.length === 0 ? (
                <div className="rounded-xl border p-10">
                    <EmptyState
                        icon={IconTarget}
                        title={filter === "submitted" ? "No milestones awaiting review" : "No milestones found"}
                        description={
                            filter === "submitted"
                                ? "Submitted milestone deliverables from your grantees will appear here."
                                : "No milestones match this filter."
                        }
                    />
                </div>
            ) : (
                <div className="rounded-xl border">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {displayed.map((m: any) => (
                        <MilestoneRow key={m._id} milestone={m} isManager={true} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MilestonesPage() {
    const { isAuthenticated } = useConvexAuth();

    const currentUser = useQuery(
        api.users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    if (currentUser === undefined) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-64" />
                <div className="rounded-xl border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
                            <Skeleton className="size-7 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!currentUser) return null;

    return currentUser.activeRole === "builder"
        ? <BuilderMilestones />
        : <ManagerMilestones />;
}