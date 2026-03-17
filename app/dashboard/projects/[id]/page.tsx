"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ProjectForm,
    parseProjectValues,
    projectToFormValues,
    type ProjectFormValues,
} from "@/components/dashboard/projects/project-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconChevronLeft,
    IconCode,
    IconAlertTriangle,
    IconTrash,
    IconBrandGithub,
    IconWorld,
    IconFileText,
    IconCircleCheck,
} from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// ─── Stat strip ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatStrip({ project }: { project: any }) {
    const items = [
        { label: "Applications", value: project.applicationCount ?? 0 },
        { label: "Grants received", value: project.grantCount ?? 0 },
        {
            label: "Total funded",
            value: project.totalFunded > 0
                ? `$${project.totalFunded.toLocaleString()}`
                : "—",
        },
        {
            label: "Status",
            value: project.status === "active" ? "Active" : "Archived",
        },
    ];

    return (
        <div className="flex items-center gap-6 rounded-xl border bg-muted/30 px-5 py-3">
            {items.map((item, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                    <div className="text-xs font-medium">{item.value}</div>
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                </div>
            ))}

            {/* External links */}
            <div className="ml-auto flex items-center gap-3">
                {project.github && (
                    <a
                        href={`https://github.com/${project.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <IconBrandGithub size={13} stroke={2} />
                        {project.github}
                    </a>
                )}
                {project.website && (
                    <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <IconWorld size={13} stroke={2} />
                        Website
                    </a>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = useQuery((api as any).projects.getById, {
        projectId: id as Id<"projects">,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateProject = useMutation((api as any).projects.update);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const archiveProject = useMutation((api as any).projects.archive);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (project === undefined) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="rounded-xl border bg-card p-8">
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (project === null) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={IconCode}
                    title="Project not found"
                    description="This project may have been archived or you don't have access to it."
                    action={{ label: "Back to Projects", href: "/dashboard/projects" }}
                />
            </div>
        );
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSave = async (values: ProjectFormValues) => {
        setError(null);
        setSaveSuccess(false);
        setIsSubmitting(true);
        try {
            await updateProject({
                projectId: id as Id<"projects">,
                ...parseProjectValues(values),
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            await archiveProject({ projectId: id as Id<"projects"> });
            router.replace("/dashboard/projects");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to archive project.");
            setIsArchiving(false);
            setShowArchiveConfirm(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Breadcrumb */}
            <Link
                href="/dashboard/projects"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
            >
                <IconChevronLeft size={13} stroke={2.5} />
                Projects
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <IconCode size={15} stroke={2} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-semibold">{project.name}</h1>
                        {project.status === "archived" && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Archived
                            </span>
                        )}
                    </div>
                </div>

                {/* Applications quick link */}
                {project.applicationCount > 0 && (
                    <Link href="/dashboard/applications">
                        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                            <IconFileText size={12} stroke={2} />
                            {project.applicationCount} application{project.applicationCount !== 1 ? "s" : ""}
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats strip */}
            <StatStrip project={project} />

            {/* Grants received callout */}
            {project.grantCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <IconCircleCheck size={15} stroke={2} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="text-xs">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {project.grantCount} grant{project.grantCount !== 1 ? "s" : ""} received
                        </span>
                        {project.totalFunded > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                                {" "}· ${project.totalFunded.toLocaleString()} total funding
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Error banner */}
            {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                </div>
            )}

            {/* Save success */}
            {saveSuccess && (
                <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    Changes saved successfully.
                </div>
            )}

            {/* Edit form */}
            <div className={cn(
                "rounded-xl border bg-card p-8 max-w-2xl",
                project.status === "archived" && "opacity-60 pointer-events-none"
            )}>
                <div className="mb-6">
                    <div className="text-sm font-medium">Project Settings</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        Keep your project profile up to date. It's shown on grant applications.
                    </div>
                </div>

                <ProjectForm
                    key={project._id}
                    initialValues={projectToFormValues(project)}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSave}
                    submitLabel="Save Changes"
                    error={null}
                />
            </div>

            {/* Danger zone — active projects only */}
            {project.status === "active" && (
                <div className="max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5">
                    <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                    <IconAlertTriangle size={14} stroke={2} />
                                    Archive project
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Archived projects are hidden from your portfolio and can't be linked to new applications.
                                </div>
                            </div>

                            {showArchiveConfirm ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground">Are you sure?</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowArchiveConfirm(false)}
                                        disabled={isArchiving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleArchive}
                                        disabled={isArchiving}
                                        className="gap-1.5"
                                    >
                                        {isArchiving ? (
                                            <>
                                                <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                                Archiving...
                                            </>
                                        ) : (
                                            <>
                                                <IconTrash size={12} stroke={2} />
                                                Archive
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                                    onClick={() => setShowArchiveConfirm(true)}
                                >
                                    Archive Project
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}