import { cn } from "@/lib/utils";

export type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "withdrawn";

const STATUS_CONFIG: Record<
    ApplicationStatus,
    { label: string; className: string; dot?: string }
> = {
    draft: {
        label: "Draft",
        className: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/50",
    },
    submitted: {
        label: "Submitted",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        dot: "bg-blue-500",
    },
    under_review: {
        label: "Under Review",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        dot: "bg-amber-500",
    },
    approved: {
        label: "Approved",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    rejected: {
        label: "Rejected",
        className: "bg-destructive/10 text-destructive",
        dot: "bg-destructive",
    },
    withdrawn: {
        label: "Withdrawn",
        className: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/30",
    },
};

export function ApplicationStatusBadge({
    status,
    className,
    showDot = false,
}: {
    status: ApplicationStatus;
    className?: string;
    showDot?: boolean;
}) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                config.className,
                className
            )}
        >
            {showDot && (
                <span className={cn("size-1.5 rounded-full", config.dot)} />
            )}
            {config.label}
        </span>
    );
}

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "withdrawn",
];