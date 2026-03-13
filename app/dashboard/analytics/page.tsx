"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import Link from "next/link";
import {
    IconChartBar,
    IconChartLine,
    IconCoins,
    IconFileText,
    IconCircleCheck,
    IconClock,
    IconTarget,
    IconExternalLink,
    IconTrendingUp,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount?: number, currency = "USD") {
    if (!amount) return "—";
    const prefix = currency === "USD" || currency === "USDC" ? "$" : "";
    const formatted = amount >= 1_000_000
        ? `${(amount / 1_000_000).toFixed(2)}M`
        : amount >= 1_000
            ? `${(amount / 1_000).toFixed(0)}K`
            : amount.toLocaleString();
    return `${prefix}${formatted}${prefix ? "" : ` ${currency}`}`;
}

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon: Icon, accent = false,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    accent?: boolean;
}) {
    return (
        <div className={cn(
            "flex flex-col gap-3 rounded-xl border p-5",
            accent ? "border-primary/20 bg-primary/5" : "bg-card"
        )}>
            <div className={cn("flex size-8 items-center justify-center rounded-lg", accent ? "bg-primary/10" : "bg-muted")}>
                <Icon size={15} stroke={2} className={accent ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
                {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
            </div>
        </div>
    );
}

// ─── Program Row ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgramSummaryRow({ program }: { program: any }) {
    const approvalRate = program.applicationCount > 0
        ? Math.round((program.approvedCount / program.applicationCount) * 100)
        : 0;

    return (
        <div className="flex items-center gap-4 border-b px-5 py-3.5 last:border-b-0">
            <div className="flex-1 min-w-0">
                <Link
                    href={`/dashboard/programs/${program._id}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                >
                    {program.name}
                    <IconExternalLink size={11} stroke={2} className="text-muted-foreground" />
                </Link>
                <div className="mt-0.5 text-[11px] text-muted-foreground capitalize">{program.status}</div>
            </div>

            <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="text-right">
                    <div className="text-xs font-semibold">{program.applicationCount}</div>
                    <div className="text-[10px] text-muted-foreground">Applications</div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{program.approvedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Approved</div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-semibold">{formatCurrency(program.totalAllocated)}</div>
                    <div className="text-[10px] text-muted-foreground">Allocated</div>
                </div>
            </div>

            {/* Mini approval rate bar */}
            <div className="w-16 shrink-0">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{approvalRate}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted">
                    <div
                        className="h-1 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${approvalRate}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myOrg = useQuery((api as any).organizations.getMyOrg, !isAuthenticated ? "skip" : undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = useQuery(
        (api as any).programs.getOrgStats,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programs = useQuery(
        (api as any).programs.listByOrg,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activity = useQuery(
        (api as any).activityLogs.getOrgActivity,
        myOrg ? { organizationId: myOrg._id, limit: 10 } : "skip"
    );

    const isLoading = myOrg === undefined || stats === undefined || programs === undefined;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-7 w-28" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!myOrg) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={IconChartBar}
                    title="No organization found"
                    description="Analytics are available for grant managers with an active organization."
                />
            </div>
        );
    }

    // Derived metrics
    const activePrograms = programs?.filter((p: any) => p.status === "active") ?? [];
    const totalApps = programs?.reduce((s: number, p: any) => s + (p.applicationCount ?? 0), 0) ?? 0;
    const totalApproved = programs?.reduce((s: number, p: any) => s + (p.approvedCount ?? 0), 0) ?? 0;
    const totalAllocated = programs?.reduce((s: number, p: any) => s + (p.totalAllocated ?? 0), 0) ?? 0;
    const overallApprovalRate = totalApps > 0 ? Math.round((totalApproved / totalApps) * 100) : 0;

    const programsWithApps = programs?.filter((p: any) => p.applicationCount > 0) ?? [];

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Analytics</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Program performance overview for <strong>{myOrg.name}</strong>.
                    </p>
                </div>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    icon={IconChartLine}
                    label="Total Programs"
                    value={programs?.length ?? 0}
                    sub={`${activePrograms.length} active`}
                />
                <StatCard
                    icon={IconFileText}
                    label="Total Applications"
                    value={totalApps}
                    sub={`${stats?.pendingReviewCount ?? 0} pending review`}
                />
                <StatCard
                    icon={IconCircleCheck}
                    label="Approved Grants"
                    value={totalApproved}
                    sub={`${overallApprovalRate}% approval rate`}
                    accent
                />
                <StatCard
                    icon={IconCoins}
                    label="Total Allocated"
                    value={formatCurrency(totalAllocated)}
                    sub="across all programs"
                    accent
                />
            </div>

            {/* Programs breakdown */}
            {programsWithApps.length > 0 ? (
                <div className="rounded-xl border bg-card">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <div className="text-sm font-semibold">Program Breakdown</div>
                        <div className="text-[11px] text-muted-foreground">Approval rate</div>
                    </div>
                    {programsWithApps.map((p: any) => <ProgramSummaryRow key={p._id} program={p} />)}
                </div>
            ) : (
                <div className="rounded-xl border p-10">
                    <EmptyState
                        icon={IconChartLine}
                        title="No applications yet"
                        description="Data will appear here as builders submit applications to your programs."
                        action={{ label: "View Programs", href: "/dashboard/programs" }}
                    />
                </div>
            )}

            {/* Status distribution + activity */}
            <div className="grid grid-cols-[1fr_320px] gap-5">
                {/* Status distribution */}
                <div className="rounded-xl border bg-card p-5">
                    <div className="mb-4 text-sm font-semibold">Application Pipeline</div>
                    {totalApps === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">No applications yet.</div>
                    ) : (() => {
                        const statuses = [
                            { label: "Submitted", key: "submitted", color: "bg-blue-400" },
                            { label: "Under Review", key: "under_review", color: "bg-amber-400" },
                            { label: "Approved", key: "approved", color: "bg-emerald-500" },
                            { label: "Rejected", key: "rejected", color: "bg-rose-400" },
                        ];
                        // We don't have per-status counts in getOrgStats directly, so we approximate from programs
                        // In a real build you'd add a dedicated query. For now show overall approved vs pending vs rejected.
                        const rows = [
                            { label: "Pending Review", value: stats?.pendingReviewCount ?? 0, color: "bg-amber-400" },
                            { label: "Approved", value: totalApproved, color: "bg-emerald-500" },
                            { label: "Other", value: Math.max(0, totalApps - (stats?.pendingReviewCount ?? 0) - totalApproved), color: "bg-muted-foreground/30" },
                        ];
                        return (
                            <div className="space-y-3">
                                {rows.map(({ label, value, color }) => {
                                    const pct = totalApps > 0 ? (value / totalApps) * 100 : 0;
                                    return (
                                        <div key={label} className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className="font-medium">{value} <span className="text-muted-foreground">({Math.round(pct)}%)</span></span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-muted">
                                                <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Stacked bar */}
                                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
                                    {rows.map(({ label, value, color }) => {
                                        const pct = totalApps > 0 ? (value / totalApps) * 100 : 0;
                                        return pct > 0 ? (
                                            <div key={label} className={cn(color, "transition-all")} style={{ width: `${pct}%` }} title={`${label}: ${value}`} />
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Recent activity */}
                <div className="rounded-xl border bg-card p-5">
                    <div className="mb-4 text-sm font-semibold">Recent Activity</div>
                    {!activity || activity.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">No activity yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {activity.slice(0, 8).map((log: any) => (
                                <div key={log._id} className="flex items-start gap-2.5">
                                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <IconTrendingUp size={9} stroke={2} className="text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] leading-snug text-foreground line-clamp-2">
                                            {log.description}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <IconClock size={9} stroke={2} />
                                            {formatDate(log._creationTime)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}