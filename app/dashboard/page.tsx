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
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ActivityItem } from "@/components/dashboard/activity-item";

// ─── Builder Overview ─────────────────────────────────────────────────────────

function BuilderOverview({ name }: { name: string }) {
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
                    value={0}
                    icon={IconFileText}
                    description="Grant applications submitted"
                    href="/dashboard/applications"
                />
                <StatCard
                    label="Active Grants"
                    value={0}
                    icon={IconCircleCheck}
                    description="Currently funded and in progress"
                    accent
                />
                <StatCard
                    label="Milestones Due"
                    value={0}
                    icon={IconTarget}
                    description="Upcoming deliverables this month"
                    href="/dashboard/milestones"
                />
                <StatCard
                    label="Total Earned"
                    value="$0"
                    icon={IconChartLine}
                    description="Across all completed grants"
                />
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Recent Applications</div>
                            <Link href="/dashboard/applications">
                                <span className="text-primary text-xs hover:underline">View all</span>
                            </Link>
                        </div>
                    </div>
                    <div className="p-5">
                        <EmptyState
                            icon={IconFileText}
                            title="No applications yet"
                            description="Browse open grant programs and submit your first application to get started."
                            action={{ label: "Browse Programs", href: "/grants" }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="text-sm font-medium">Activity</div>
                    </div>
                    <div className="divide-y px-5">
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
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Manager Overview ─────────────────────────────────────────────────────────

function ManagerOverview({ name }: { name: string }) {
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
                    value={0}
                    icon={IconCommand}
                    description="Currently accepting applications"
                    href="/dashboard/programs"
                    accent
                />
                <StatCard
                    label="Pending Review"
                    value={0}
                    icon={IconFileText}
                    description="Applications awaiting your review"
                    href="/dashboard/applications"
                />
                <StatCard
                    label="Total Funded"
                    value="$0"
                    icon={IconChartLine}
                    description="Distributed across all programs"
                />
                <StatCard
                    label="Team Members"
                    value={1}
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
                                <span className="text-primary text-xs hover:underline">View all</span>
                            </Link>
                        </div>
                    </div>
                    <div className="p-5">
                        <EmptyState
                            icon={IconCommand}
                            title="No programs yet"
                            description="Create your first grant program to start receiving applications from builders in the ecosystem."
                            action={{ label: "Create Program", href: "/dashboard/programs/new" }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <div className="text-sm font-medium">Activity</div>
                    </div>
                    <div className="divide-y px-5">
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
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUser = useQuery(
        (api as any).users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    if (!currentUser) return null;

    if (currentUser.activeRole === "builder") {
        return <BuilderOverview name={currentUser.name} />;
    }

    return <ManagerOverview name={currentUser.name} />;
}