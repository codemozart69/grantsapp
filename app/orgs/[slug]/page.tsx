"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MechanismBadge, StatusBadge } from "@/components/dashboard/programs/status-badge";
import {
    IconChevronLeft,
    IconWorld,
    IconBrandTwitter,
    IconBrandGithub,
    IconExternalLink,
    IconBuilding,
    IconCommand,
    IconFileText,
    IconCircleCheck,
    IconChartLine,
    IconUsers,
    IconCalendar,
    IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ProgramStatus } from "@/components/dashboard/programs/status-badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts?: number) {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatCurrency(amount: number) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
}

function daysUntil(ts?: number): string | null {
    if (!ts) return null;
    const days = Math.ceil((ts - Date.now()) / 86_400_000);
    if (days < 0) return "Closed";
    if (days === 0) return "Closes today";
    if (days === 1) return "1 day left";
    if (days <= 14) return `${days} days left`;
    return null;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    accent?: boolean;
}) {
    return (
        <div className={cn(
            "flex flex-col gap-2 rounded-xl border p-4",
            accent ? "border-primary/20 bg-primary/3" : "border-border bg-card"
        )}>
            <div className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
                <Icon size={14} stroke={2} />
            </div>
            <div>
                <div className={cn(
                    "text-xl font-semibold tracking-tight",
                    accent && "text-primary"
                )}>
                    {value}
                </div>
                <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}

// ─── Program card ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgramCard({ program }: { program: any }) {
    const deadline = daysUntil(program.applicationEndDate);
    const isActive = program.status === "active";

    return (
        <Link href={`/grants/${program.slug}`}>
            <div className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={program.status as ProgramStatus} />
                    <MechanismBadge mechanism={program.mechanism} />
                    {deadline && isActive && (
                        <span className={cn(
                            "text-[10px] font-medium",
                            deadline === "Closes today" || deadline === "1 day left"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                        )}>
                            {deadline}
                        </span>
                    )}
                </div>

                {/* Name + description */}
                <div>
                    <div className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                        {program.name}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
                        {program.description}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-2.5">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <IconFileText size={10} stroke={2} />
                            {program.applicationCount}
                        </span>
                        {program.budget && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <IconChartLine size={10} stroke={2} />
                                {program.currency === "USD" || program.currency === "USDC" ? "$" : ""}
                                {program.budget >= 1_000
                                    ? `${(program.budget / 1_000).toFixed(0)}K`
                                    : program.budget.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <IconChevronRight
                        size={12}
                        stroke={2}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                </div>
            </div>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgProfilePage() {
    const { slug } = useParams<{ slug: string }>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = useQuery((api as any).organizations.getBySlug, { slug });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programs = useQuery(
        (api as any).programs.listByOrg,
        org ? { organizationId: org._id } : "skip"
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgStats = useQuery(
        (api as any).programs.getOrgStats,
        org ? { organizationId: org._id } : "skip"
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersData = useQuery(
        (api as any).organizationMembers.listMembers,
        org ? { organizationId: org._id } : "skip"
    );

    const isLoading = org === undefined || programs === undefined || orgStats === undefined;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-3.5rem)] bg-background">
                <div className="border-b bg-muted/20 px-6 py-3">
                    <div className="mx-auto max-w-5xl">
                        <Skeleton className="h-4 w-28" />
                    </div>
                </div>
                <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
                    <div className="flex items-start gap-5">
                        <Skeleton className="size-16 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-full max-w-sm" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!org) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <EmptyState
                    icon={IconBuilding}
                    title="Organization not found"
                    description="This organization profile doesn't exist or is no longer available."
                    action={{ label: "Browse Grants", href: "/grants" }}
                />
            </div>
        );
    }

    // ── Derived ──────────────────────────────────────────────────────────────

    const activePrograms = programs?.filter((p: any) => p.status === "active") ?? [];
    const pastPrograms = programs?.filter((p: any) =>
        ["closed", "completed", "paused"].includes(p.status)
    ) ?? [];
    const memberCount = (membersData?.members?.length ?? 0) + (membersData?.owner ? 1 : 0);

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background">
            {/* Breadcrumb */}
            <div className="border-b bg-muted/20 px-6 py-3">
                <div className="mx-auto max-w-5xl">
                    <Link
                        href="/grants"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
                    >
                        <IconChevronLeft size={13} stroke={2.5} />
                        Browse Grants
                    </Link>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
                {/* Org header */}
                <div className="flex items-start gap-5">
                    {/* Logo */}
                    {org.logo ? (
                        <img
                            src={org.logo}
                            alt={org.name}
                            className="size-16 rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <div className="size-6 rounded-md bg-primary" />
                        </div>
                    )}

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                            {org.description}
                        </p>

                        {/* Links */}
                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                            {org.website && (
                                <a
                                    href={org.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <IconWorld size={13} stroke={2} />
                                    {org.website.replace(/^https?:\/\//, "")}
                                </a>
                            )}
                            {org.twitter && (
                                <a
                                    href={`https://twitter.com/${org.twitter}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <IconBrandTwitter size={13} stroke={2} />
                                    @{org.twitter}
                                </a>
                            )}
                            {org.github && (
                                <a
                                    href={`https://github.com/${org.github}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <IconBrandGithub size={13} stroke={2} />
                                    {org.github}
                                </a>
                            )}
                            {org.createdAt && (
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <IconCalendar size={13} stroke={2} />
                                    Since {formatDate(org.createdAt)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Browse CTA */}
                    {activePrograms.length > 0 && (
                        <Link href="/grants" className="shrink-0">
                            <Button size="sm" className="gap-1.5">
                                <IconExternalLink size={12} stroke={2} />
                                Browse Open Grants
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard
                        icon={IconChartLine}
                        label="Total funded"
                        value={orgStats.totalAllocated > 0
                            ? formatCurrency(orgStats.totalAllocated)
                            : "$0"}
                        accent={orgStats.totalAllocated > 0}
                    />
                    <StatCard
                        icon={IconCommand}
                        label="Programs"
                        value={orgStats.totalProgramCount}
                    />
                    <StatCard
                        icon={IconCircleCheck}
                        label="Projects funded"
                        value={orgStats.totalApproved}
                    />
                    <StatCard
                        icon={IconUsers}
                        label="Team members"
                        value={memberCount || 1}
                    />
                </div>

                {/* Active programs */}
                {activePrograms.length > 0 && (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-semibold">
                                Open Programs
                                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                                    ({activePrograms.length})
                                </span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {activePrograms.map((program: any) => (
                                <ProgramCard key={program._id} program={program} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Past programs */}
                {pastPrograms.length > 0 && (
                    <div>
                        <div className="mb-4">
                            <h2 className="text-base font-semibold">
                                Past Programs
                                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                                    ({pastPrograms.length})
                                </span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {pastPrograms.map((program: any) => (
                                <ProgramCard key={program._id} program={program} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state — no programs yet */}
                {programs?.length === 0 && (
                    <div className="rounded-xl border">
                        <div className="p-10">
                            <EmptyState
                                icon={IconCommand}
                                title="No programs yet"
                                description="This organization hasn't launched any grant programs yet. Check back soon."
                                action={{ label: "Browse All Grants", href: "/grants" }}
                            />
                        </div>
                    </div>
                )}

                {/* Team (public member list — names only) */}
                {membersData && (membersData.owner || membersData.members?.length > 0) && (
                    <div>
                        <div className="mb-4">
                            <h2 className="text-base font-semibold">Team</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {/* Owner */}
                            {membersData.owner && (
                                <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
                                    {membersData.owner.avatar ? (
                                        <img
                                            src={membersData.owner.avatar}
                                            alt={membersData.owner.name}
                                            className="size-5 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                                            {membersData.owner.name?.[0]?.toUpperCase() ?? "?"}
                                        </div>
                                    )}
                                    <span className="text-xs font-medium">{membersData.owner.name}</span>
                                    <span className="text-[10px] text-muted-foreground">Owner</span>
                                </div>
                            )}

                            {/* Other members */}
                            {membersData.members
                                ?.filter((m: any) => m.status === "active")
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .map((member: any) => (
                                    <div
                                        key={member._id}
                                        className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5"
                                    >
                                        {member.user?.avatar ? (
                                            <img
                                                src={member.user.avatar}
                                                alt={member.user.name}
                                                className="size-5 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                                                {member.user?.name?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                        <span className="text-xs">{member.user?.name ?? "—"}</span>
                                        <span className="text-[10px] text-muted-foreground capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}