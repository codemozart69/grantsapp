"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconSearch,
    IconGridDots,
    IconBrandGithub,
    IconWorld,
    IconChevronRight,
    IconFileText,
    IconCircleCheck,
    IconFilter,
    IconCode,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
    "All", "DeFi", "NFT", "Infrastructure", "Tooling", "Gaming",
    "Research", "Developer Experience", "Storage", "Identity",
    "Social", "DAO", "Security", "Layer 2",
];

const ECOSYSTEMS = [
    "All", "Filecoin", "Ethereum", "Solana", "Polygon",
    "Arbitrum", "Optimism", "Base", "Cosmos", "NEAR",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFunded(amount: number) {
    if (!amount) return null;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M funded`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K funded`;
    return `$${amount.toLocaleString()} funded`;
}

// ─── Project card ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProjectCard({ project }: { project: any }) {
    const tags = [
        ...(project.categories ?? []).slice(0, 2),
        ...(project.ecosystems ?? []).slice(0, 1),
    ].slice(0, 3);

    const funded = formatFunded(project.totalFunded);

    return (
        <Link href={`/projects/${project.slug}`}>
            <div className="group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-all duration-150 hover:border-primary/40 hover:shadow-sm cursor-pointer">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        {project.logo ? (
                            <img
                                src={project.logo}
                                alt={project.name}
                                className="size-8 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <IconCode size={15} stroke={2} className="text-muted-foreground" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                                {project.name}
                            </div>
                            {project.owner && (
                                <div className="text-[11px] text-muted-foreground">
                                    @{project.owner.username}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grant badge */}
                    {project.grantCount > 0 && (
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <IconCircleCheck size={9} stroke={2.5} />
                            {project.grantCount} grant{project.grantCount !== 1 ? "s" : ""}
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="flex-1 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                    {project.description}
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {tags.map((tag: string) => (
                            <span
                                key={tag}
                                className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <IconFileText size={11} stroke={2} />
                            {project.applicationCount} app{project.applicationCount !== 1 ? "s" : ""}
                        </div>
                        {funded && (
                            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                {funded}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {project.github && (
                            <span className="text-muted-foreground">
                                <IconBrandGithub size={13} stroke={2} />
                            </span>
                        )}
                        {project.website && (
                            <span className="text-muted-foreground">
                                <IconWorld size={13} stroke={2} />
                            </span>
                        )}
                        <IconChevronRight
                            size={13}
                            stroke={2}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        />
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-lg" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex gap-1">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex justify-between border-t pt-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [ecosystem, setEcosystem] = useState<string | undefined>(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects = useQuery((api as any).projects.listPublic, {
        category,
        ecosystem,
    });

    const isLoading = projects === undefined;

    // Client-side search filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = projects?.filter((p: any) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.owner?.username?.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background">
            {/* Hero */}
            <div className="border-b bg-muted/30 px-6 py-12 text-center">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
                        <IconGridDots size={12} stroke={2} />
                        Projects Explorer
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Explore Funded Projects
                    </h1>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        Discover projects building across ecosystems. Browse funding histories,
                        contributions, and the teams behind them.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-3">
                <div className="mx-auto flex max-w-6xl items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <IconSearch
                            size={13}
                            stroke={2}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>

                    {/* Category pills */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {CATEGORIES.map((cat) => {
                            const val = cat === "All" ? undefined : cat;
                            const active = category === val;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(val)}
                                    className={cn(
                                        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all cursor-pointer",
                                        active
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>

                    {/* Ecosystem filter */}
                    <div className="flex items-center gap-1 shrink-0">
                        <IconFilter size={12} stroke={2} className="text-muted-foreground" />
                        <select
                            value={ecosystem ?? ""}
                            onChange={(e) => setEcosystem(e.target.value || undefined)}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {ECOSYSTEMS.map((eco) => (
                                <option key={eco} value={eco === "All" ? "" : eco}>
                                    {eco}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="mx-auto max-w-6xl px-6 py-8">
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <ProjectCardSkeleton key={i} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                            <IconGridDots size={20} stroke={1.5} className="text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">No projects found</div>
                            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                                {search
                                    ? `No projects matching "${search}". Try a different search.`
                                    : "No projects match your current filters."}
                            </p>
                        </div>
                        {(search || category || ecosystem) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSearch(""); setCategory(undefined); setEcosystem(undefined); }}
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {filtered.map((project: any) => (
                                <ProjectCard key={project._id} project={project} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}