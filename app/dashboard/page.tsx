"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    IconFileText,
    IconTarget,
    IconCommand,
    IconUsers,
    IconChartLine,
    IconPlus,
    IconCircleCheck,
    IconChevronRight,
    IconClock,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ApplicationStatusBadge } from "@/components/dashboard/applications/application-status-badge";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount?: number, currency = "USD") {
    if (!amount) return null;
    const prefix = currency === "USD" || currency === "USDC" ? "$" : "";
    return `${prefix}${amount.toLocaleString()}`;
}

function actionToIcon(action: string) {
    if (action.startsWith("program.")) return IconCommand;
    if (action.startsWith("application.")) return IconFileText;
    if (action.startsWith("milestone.")) return IconTarget;
    if (action.startsWith("team.")) return IconUsers;
    return IconCircleCheck;
}

// ─── Recent Application Row ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecentApplicationRow({ application }: { application: any }) {
    return (
        <Link href={`/dashboard/applications/${application._id}`}>
            <div className="group flex items-center gap-3 py-3 border-b last:border-b-0 hover:bg-muted/20 -mx-5 px-5 transition-colors">
                <ApplicationStatusBadge status={application.status} showDot />
                <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">{application.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {application.program?.name ?? "Unknown Program"}
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    {application.status === "approved" && application.approvedAmount ? (
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(application.approvedAmount, application.program?.currency)}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <IconClock size={10} stroke={2} />
                            {formatDate(application.submittedAt ?? application.createdAt)}
                        </div>
                    )}
                </div>
                <IconChevronRight
                    size={12}
                    stroke={2}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
            </div>
        </Link>
    );
}

// ─── Builder Overview ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BuilderOverview({ currentUser }: { currentUser: any }) {
    const { isAuthenticated } = useConvexAuth();

    const builderStats = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).projects.getBuilderStats,
        !isAuthenticated ? "skip" : undefined
    );

    // Get recent applications (last 4)
    const recentApplications = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).applications.listMine,
        !isAuthenticated ? "skip" : {}
    );

    const activity = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).activityLogs.getUserActivity,
        !isAuthenticated ? "skip" : { limit: 8 }
    );

    const name = currentUser.name;
    // Show only the 4 most recent applications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestApps = recentApplications?.slice(0, 4) ?? [];

    return (
        <div className="flex flex-col gap-8 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">
                        Good to have you, {name.split(" ")[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Here&apos;s a snapshot of your grants activity.
                    </p>
                </div>
                <Link href="/grants">
                    <Button size="sm" className="gap-1.5">
                        <IconPlus size={12} stroke={2.5} />
                        Browse Grants
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    label="Applications"
                    value={builderStats?.applicationCount ?? 0}
                    icon={IconFileText}
                    description="Grant applications submitted"
                    href="/dashboard/applications"
                />
                <StatCard
                    label="Active Grants"
                    value={builderStats?.activeGrantCount ?? 0}
                    icon={IconCircleCheck}
                    description="Currently funded and in progress"
                    accent
                />
                <StatCard
                    label="Milestones Due"
                    value={builderStats?.milestoneDueCount ?? 0}
                    icon={IconTarget}
                    description="Upcoming deliverables this month"
                    href="/dashboard/milestones"
                />
                <StatCard
                    label="Total Earned"
                    value={
                        builderStats?.totalEarned
                            ? `$${builderStats.totalEarned.toLocaleString()}`
                            : "$0"
                    }
                    icon={IconChartLine}
                    description="Across all completed grants"
                />
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Recent Applications — real data */}
                <div className="col-span-2 rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Recent Applications</div>
                            <Link href="/dashboard/applications">
                                <span className="text-primary text-xs hover:underline">
                                    View all
                                </span>
                            </Link>
                        </div>
                    </div>
                    <div className="px-5 py-2">
                        {recentApplications === undefined ? (
                            // Loading
                            <div className="space-y-3 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 py-2">
                                        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                                            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : latestApps.length === 0 ? (
                            <div className="py-8">
                                <EmptyState
                                    icon={IconFileText}
                                    title="No applications yet"
                                    description="Browse open grant programs and submit your first application to get started."
                                    action={{ label: "Browse Programs", href: "/grants" }}
                                />
                            </div>
                        ) : (
                            <div>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {latestApps.map((app: any) => (
                                    <RecentApplicationRow key={app._id} application={app} />
                                ))}
                                {(recentApplications?.length ?? 0) > 4 && (
                                    <div className="py-3 text-center">
                                        <Link
                                            href="/dashboard/applications"
                                            className="text-[11px] text-primary hover:underline"
                                        >
                                            View all {recentApplications?.length} applications →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="text-sm font-medium">Activity</div>
                    </div>
                    <div className="divide-y px-5">
                        {activity && activity.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            activity.map((log: any) => (
                                <ActivityItem
                                    key={log._id}
                                    icon={actionToIcon(log.action)}
                                    text={log.description}
                                    time={relativeTime(log.createdAt)}
                                    iconColor={
                                        log.action.includes("approved")
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }
                                />
                            ))
                        ) : (
                            <>
                                <ActivityItem
                                    icon={IconCircleCheck}
                                    text="Builder profile created successfully"
                                    time="Just now"
                                    iconColor="text-primary"
                                />
                                <div className="py-4 text-center">
                                    <span className="text-muted-foreground text-[11px]">
                                        Your activity will appear here
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Program Row ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgramRow({ program }: { program: any }) {
    return (
        <Link href={`/dashboard/programs/${program._id}`}>
            <div className="group flex items-center gap-3 py-3 border-b last:border-b-0 hover:bg-muted/20 -mx-5 px-5 transition-colors">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="truncate text-xs font-medium">{program.name}</div>
                        {program.status === "active" && (
                            <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                                Active
                            </span>
                        )}
                        {program.status === "draft" && (
                            <span className="shrink-0 rounded-full bg-muted/50 border border-border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                Draft
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate flex gap-2 items-center">
                        <span>{program.applicationCount || 0} app{(program.applicationCount !== 1) ? "s" : ""}</span>
                        <span className="opacity-40">&bull;</span>
                        <span>{formatCurrency(program.budget, program.currency) ?? "Open budget"}</span>
                    </div>
                </div>
                <IconChevronRight
                    size={12}
                    stroke={2}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
            </div>
        </Link>
    );
}

// ─── Manager Overview ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ManagerOverview({ currentUser }: { currentUser: any }) {
    const { isAuthenticated } = useConvexAuth();

    const myOrg = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).organizations.getMyOrg,
        !isAuthenticated ? "skip" : undefined
    );

    const orgStats = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).programs.getOrgStats,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const orgMembers = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).organizationMembers.listMembers,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const activity = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).activityLogs.getOrgActivity,
        myOrg ? { organizationId: myOrg._id, limit: 8 } : "skip"
    );

    const recentPrograms = useQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).programs.listByOrg,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const memberCount =
        (orgMembers?.members?.length ?? 0) + (orgMembers?.owner ? 1 : 0);

    const name = currentUser.name;

    return (
        <div className="flex flex-col gap-8 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">
                        Good to have you, {name.split(" ")[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your grant programs and review incoming applications.
                    </p>
                </div>
                <Link href="/dashboard/programs/new">
                    <Button size="sm" className="gap-1.5">
                        <IconPlus size={12} stroke={2.5} />
                        New Program
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    label="Active Programs"
                    value={orgStats?.activeProgramCount ?? 0}
                    icon={IconCommand}
                    description="Currently accepting applications"
                    href="/dashboard/programs"
                    accent
                />
                <StatCard
                    label="Pending Review"
                    value={orgStats?.pendingReviewCount ?? 0}
                    icon={IconFileText}
                    description="Applications awaiting your review"
                    href="/dashboard/applications"
                />
                <StatCard
                    label="Total Funded"
                    value={
                        orgStats?.totalAllocated
                            ? `$${orgStats.totalAllocated.toLocaleString()}`
                            : "$0"
                    }
                    icon={IconChartLine}
                    description="Distributed across all programs"
                />
                <StatCard
                    label="Team Members"
                    value={memberCount || 1}
                    icon={IconUsers}
                    description="Reviewers and collaborators"
                    href="/dashboard/team"
                />
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Your Programs</div>
                            <Link href="/dashboard/programs">
                                <span className="text-primary text-xs hover:underline">
                                    View all
                                </span>
                            </Link>
                        </div>
                    </div>
                    <div className="px-5 py-2">
                        {recentPrograms === undefined ? (
                            <div className="space-y-3 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 py-2">
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                                            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentPrograms.length === 0 ? (
                            <div className="py-8">
                                <EmptyState
                                    icon={IconCommand}
                                    title="No programs yet"
                                    description="Create your first grant program to start receiving applications from builders."
                                    action={{
                                        label: "Create Program",
                                        href: "/dashboard/programs/new",
                                    }}
                                />
                            </div>
                        ) : (
                            <div>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {recentPrograms.slice(0, 4).map((program: any) => (
                                    <ProgramRow key={program._id} program={program} />
                                ))}

                                {recentPrograms.length > 4 && (
                                    <div className="py-3 text-center">
                                        <Link
                                            href="/dashboard/programs"
                                            className="text-[11px] text-primary hover:underline"
                                        >
                                            View all {recentPrograms.length} programs →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="text-sm font-medium">Activity</div>
                    </div>
                    <div className="divide-y px-5">
                        {activity && activity.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            activity.map((log: any) => (
                                <ActivityItem
                                    key={log._id}
                                    icon={actionToIcon(log.action)}
                                    text={log.description}
                                    time={relativeTime(log.createdAt)}
                                    iconColor={
                                        log.action.includes("published") ||
                                            log.action.includes("approved")
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }
                                />
                            ))
                        ) : (
                            <>
                                <ActivityItem
                                    icon={IconCircleCheck}
                                    text="Organization profile created successfully"
                                    time="Just now"
                                    iconColor="text-primary"
                                />
                                <div className="py-4 text-center">
                                    <span className="text-muted-foreground text-[11px]">
                                        Program activity will appear here
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { isAuthenticated } = useConvexAuth();

    const currentUser = useQuery(
        api.users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    if (currentUser === undefined) return <DashboardSkeleton />;
    if (currentUser === null) return null;

    if (currentUser.activeRole === "builder") {
        return <BuilderOverview currentUser={currentUser} />;
    }

    return <ManagerOverview currentUser={currentUser} />;
}