"use client";

import { useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge } from "@/components/dashboard/applications/application-status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconFileText,
    IconChevronRight,
    IconChevronDown,
    IconClock,
    IconUser,
    IconDownload,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/components/dashboard/applications/application-status-badge";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function formatCurrency(amount?: number, currency = "USD") {
    if (!amount) return "—";
    const prefix = currency === "USD" || currency === "USDC" ? "$" : "";
    return `${prefix}${amount.toLocaleString()}${prefix ? "" : ` ${currency}`}`;
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const BUILDER_FILTERS: { label: string; value: ApplicationStatus | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Under Review", value: "under_review" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
];

const MANAGER_FILTERS: { label: string; value: ApplicationStatus | "all" }[] = [
    { label: "Needs Review", value: "submitted" },
    { label: "Under Review", value: "under_review" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "All", value: "all" },
];

// ─── Application Row ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ApplicationRow({ application, isManager }: { application: any; isManager: boolean }) {
    return (
        <Link href={`/dashboard/applications/${application._id}`}>
            <div className="group flex items-center gap-4 border-b px-5 py-4 transition-colors hover:bg-muted/30 last:border-b-0">
                {/* Status */}
                <div className="shrink-0">
                    <ApplicationStatusBadge status={application.status} showDot />
                </div>

                {/* Main info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="truncate text-sm font-medium">{application.title}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {/* Program name */}
                        <span className="truncate">
                            {application.program?.name ?? "Unknown Program"}
                        </span>
                        {/* Builder name — shown in manager view, links to builder profile */}
                        {isManager && application.applicant && (
                            <>
                                <span className="opacity-30">·</span>
                                <Link
                                    href={`/builders/${application.applicant.username}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                    <IconUser size={10} stroke={2} />
                                    @{application.applicant.username}
                                </Link>
                            </>
                        )}
                        {/* Project */}
                        {application.project && (
                            <>
                                <span className="opacity-30">·</span>
                                <span>{application.project.name}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                    {application.status === "approved" && application.approvedAmount ? (
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(application.approvedAmount, application.program?.currency)}
                        </div>
                    ) : application.requestedAmount ? (
                        <div className="text-xs text-muted-foreground">
                            {formatCurrency(application.requestedAmount, application.program?.currency)} requested
                        </div>
                    ) : null}
                </div>

                {/* Date */}
                <div className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <IconClock size={11} stroke={2} />
                    {application.submittedAt
                        ? formatDate(application.submittedAt)
                        : formatDate(application.createdAt)}
                </div>

                {/* Arrow */}
                <IconChevronRight
                    size={14} stroke={2}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
            </div>
        </Link>
    );
}

// ─── Builder View ─────────────────────────────────────────────────────────────

function BuilderApplications() {
    const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applications = useQuery(
        (api as any).applications.listMine,
        !isAuthenticated ? "skip" : {
            status: filter !== "all" ? filter : undefined,
        }
    );

    const isLoading = applications === undefined;

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Applications</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track all your grant applications across programs.
                    </p>
                </div>
                <Link href="/grants">
                    <Button size="sm" variant="outline" className="gap-1.5">
                        Browse Programs
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5 w-fit">
                {BUILDER_FILTERS.map(({ label, value }) => (
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
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
            ) : !applications || applications.length === 0 ? (
                <div className="rounded-xl border">
                    <div className="p-10">
                        <EmptyState
                            icon={IconFileText}
                            title={filter === "all" ? "No applications yet" : `No ${filter.replace("_", " ")} applications`}
                            description={
                                filter === "all"
                                    ? "Browse open grant programs and submit your first application."
                                    : "No applications match this filter."
                            }
                            action={filter === "all" ? { label: "Browse Programs", href: "/grants" } : undefined}
                        />
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {applications.map((app: any) => (
                        <ApplicationRow key={app._id} application={app} isManager={false} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Manager View ─────────────────────────────────────────────────────────────

function ManagerApplications() {
    const [filter, setFilter] = useState<ApplicationStatus | "all">("submitted");
    const { isAuthenticated } = useConvexAuth();
    const searchParams = useSearchParams();
    // Pre-select program filter if ?program= is in URL (e.g. coming from program detail page)
    const [programFilter, setProgramFilter] = useState<string | "all">(
        searchParams.get("program") ?? "all"
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myOrg = useQuery(
        (api as any).organizations.getMyOrg,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programs = useQuery(
        (api as any).programs.listByOrg,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const allApplications = useQuery(
        (api as any).applications.listByOrg,
        myOrg ? { organizationId: myOrg._id, status: filter !== "all" ? filter : undefined } : "skip"
    );

    const isLoading = myOrg === undefined || programs === undefined || allApplications === undefined;

    // Client-side program filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const displayed = programFilter === "all"
        ? (allApplications ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (allApplications ?? []).filter((a: any) => a.programId === programFilter);

    const handleExportCSV = () => {
        if (!displayed || displayed.length === 0) return;

        const headers = [
            "Application ID",
            "Title",
            "Status",
            "Program",
            "Applicant Username",
            "Applicant Wallet",
            "Requested Amount",
            "Approved Amount",
            "Currency",
            "Submitted At",
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = displayed.map((app: any) => [
            app._id,
            `"${(app.title || "").replace(/"/g, '""')}"`,
            app.status,
            `"${(app.program?.name || "").replace(/"/g, '""')}"`,
            `"${app.applicant?.username || ""}"`,
            app.applicant?.walletAddress || "",
            app.requestedAmount || 0,
            app.approvedAmount || 0,
            app.program?.currency || "USD",
            app.submittedAt ? new Date(app.submittedAt).toISOString() : "",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const timestamp = new Date().toISOString().split("T")[0];
        const filename = programFilter === "all" 
            ? `all_applications_${timestamp}.csv` 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : `${programs?.find((p: any) => p._id === programFilter)?.slug || "program"}_applications_${timestamp}.csv`;
            
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Applications</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review incoming applications across all your programs.
                    </p>
                </div>
                {displayed && displayed.length > 0 && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1.5"
                        onClick={handleExportCSV}
                    >
                        <IconDownload size={14} stroke={2} />
                        Export CSV
                    </Button>
                )}
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Status filter */}
                <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
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

                {/* Program filter */}
                {programs && programs.length > 1 && (
                    <div className="relative">
                        <select
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            className="h-8 rounded-lg border border-input bg-background pl-3 pr-8 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                        >
                            <option value="all">All programs</option>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {programs.map((p: any) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                        <IconChevronDown
                            size={12}
                            stroke={2}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                    </div>
                )}

                {/* Active filter indicator */}
                {programFilter !== "all" && programs && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {programs.find((p: any) => p._id === programFilter)?.name}
                        <button onClick={() => setProgramFilter("all")} className="hover:text-primary/70">×</button>
                    </div>
                )}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="rounded-xl border">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
            ) : programs?.length === 0 ? (
                <div className="rounded-xl border p-10">
                    <EmptyState
                        icon={IconFileText}
                        title="No programs yet"
                        description="Create a grant program to start receiving applications."
                        action={{ label: "Create Program", href: "/dashboard/programs/new" }}
                    />
                </div>
            ) : displayed.length === 0 ? (
                <div className="rounded-xl border p-10">
                    <EmptyState
                        icon={IconFileText}
                        title={filter === "submitted" ? "No applications to review" : `No ${filter.replace("_", " ")} applications`}
                        description={
                            filter === "submitted"
                                ? "New applications will appear here as builders submit them."
                                : "No applications match this filter."
                        }
                    />
                </div>
            ) : (
                <div className="rounded-xl border">
                    {displayed.map((app: any) => (
                        <ApplicationRow key={app._id} application={app} isManager={true} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
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
        ? <BuilderApplications />
        : <ManagerApplications />;
}