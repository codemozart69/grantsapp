import { cn } from "@/lib/utils";

export type ProgramStatus = "draft" | "active" | "paused" | "closed" | "completed";

const STATUS_CONFIG: Record<
    ProgramStatus,
    { label: string; className: string }
> = {
    draft: {
        label: "Draft",
        className: "bg-muted text-muted-foreground",
    },
    active: {
        label: "Active",
        className:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    paused: {
        label: "Paused",
        className:
            "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    closed: {
        label: "Closed",
        className:
            "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    },
    completed: {
        label: "Completed",
        className: "bg-primary/10 text-primary",
    },
};

interface StatusBadgeProps {
    status: ProgramStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
}

export function MechanismBadge({
    mechanism,
}: {
    mechanism: "direct" | "milestone";
}) {
    return (
        <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {mechanism === "direct" ? "Direct Grant" : "Milestone-Based"}
        </span>
    );
}