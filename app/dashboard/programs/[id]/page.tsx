"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/programs/status-badge";
import {
  ProgramForm,
  parseFormValues,
  programToFormValues,
  type ProgramFormValues,
} from "@/components/dashboard/programs/program-form";
import { VaultDeploymentPanel } from "@/components/dashboard/programs/vault-deployment-panel";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconChevronLeft,
  IconFileText,
  IconAlertTriangle,
  IconTrash,
} from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import type { ProgramStatus } from "@/components/dashboard/programs/status-badge";
import { cn } from "@/lib/utils";

// ─── Status transition config ─────────────────────────────────────────────────

type StatusAction = {
  label: string;
  targetStatus: ProgramStatus;
  variant: "default" | "outline" | "destructive";
};

function getStatusActions(current: ProgramStatus): StatusAction[] {
  switch (current) {
    case "draft":
      return [
        { label: "Publish Program", targetStatus: "active", variant: "default" },
      ];
    case "active":
      return [
        { label: "Pause", targetStatus: "paused", variant: "outline" },
        { label: "Close Program", targetStatus: "closed", variant: "outline" },
      ];
    case "paused":
      return [
        { label: "Resume", targetStatus: "active", variant: "default" },
        { label: "Close Program", targetStatus: "closed", variant: "outline" },
      ];
    case "closed":
      return [
        { label: "Mark as Completed", targetStatus: "completed", variant: "outline" },
      ];
    case "completed":
      return [];
  }
}

// ─── Program stats strip ──────────────────────────────────────────────────────

function StatStrip({ program }: { program: any }) {
  const items = [
    { label: "Applications", value: program.applicationCount },
    { label: "Approved", value: program.approvedCount },
    {
      label: "Total Funded",
      value: program.totalAllocated > 0
        ? `$${program.totalAllocated.toLocaleString()}`
        : "—",
    },
    {
      label: "Mechanism",
      value: program.mechanism === "direct" ? "Direct Grant" : "Milestone-Based",
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
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = useQuery((api as any).programs.getById, {
    programId: id as Id<"programs">,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateProgram = useMutation((api as any).programs.update);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStatus = useMutation((api as any).programs.updateStatus);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteProgram = useMutation((api as any).programs.deleteProgram);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (program === undefined) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
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

  if (program === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={IconFileText}
          title="Program not found"
          description="This program may have been deleted or you don't have access to it."
          action={{ label: "Back to Programs", href: "/dashboard/programs" }}
        />
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSave = async (values: ProgramFormValues) => {
    setError(null);
    setSaveSuccess(false);
    setIsSubmitting(true);
    try {
      await updateProgram({
        programId: id as Id<"programs">,
        ...parseFormValues(values),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (targetStatus: ProgramStatus) => {
    setIsStatusChanging(true);
    try {
      await updateStatus({
        programId: id as Id<"programs">,
        status: targetStatus,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProgram({ programId: id as Id<"programs"> });
      router.replace("/dashboard/programs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete program.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const statusActions = getStatusActions(program.status as ProgramStatus);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/programs"
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
      >
        <IconChevronLeft size={13} stroke={2.5} />
        Programs
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-xl font-semibold">{program.name}</h1>
          <StatusBadge status={program.status as ProgramStatus} />
        </div>

        {/* Status action buttons */}
        {statusActions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {statusActions.map((action) => (
              <Button
                key={action.targetStatus}
                variant={action.variant}
                size="sm"
                onClick={() => handleStatusChange(action.targetStatus)}
                disabled={isStatusChanging}
                className={cn(
                  action.targetStatus === "closed" &&
                    "border-destructive/40 text-destructive hover:bg-destructive/10"
                )}
              >
                {isStatusChanging ? (
                  <span className="flex items-center gap-1.5">
                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Updating...
                  </span>
                ) : (
                  action.label
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Stats strip */}
      <StatStrip program={program} />

      {/* Status change error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Save success toast */}
      {saveSuccess && (
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          Changes saved successfully.
        </div>
      )}

      {/* Edit form */}
      <div className="rounded-xl border bg-card p-8 max-w-3xl">
        <div className="mb-6">
          <div className="text-sm font-medium">Program Settings</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Changes are saved as a draft and don&apos;t affect live
            applications.
          </div>
        </div>

        <ProgramForm
          key={program._id}
          initialValues={programToFormValues(program)}
          isSubmitting={isSubmitting}
          onSubmit={handleSave}
          submitLabel="Save Changes"
          error={null}
        />
      </div>

      {/* Applications preview */}
      <div className="max-w-3xl rounded-xl border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-medium">
            Applications
            {program.applicationCount > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {program.applicationCount}
              </span>
            )}
          </div>
          <Link href={`/dashboard/applications?program=${program._id}`}>
            <span className="text-xs text-primary hover:underline">
              View all
            </span>
          </Link>
        </div>
        <div className="p-5">
          {program.applicationCount === 0 ? (
            <EmptyState
              icon={IconFileText}
              title="No applications yet"
              description={
                program.status === "draft"
                  ? "Publish your program to start accepting applications."
                  : "Applications will appear here once builders submit them."
              }
            />
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Application review coming in the next update.{" "}
              <Link
                href={`/dashboard/applications?program=${program._id}`}
                className="text-primary hover:underline"
              >
                View in Applications →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone — only for draft programs */}
      {program.status === "draft" && (
        <div className="max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <IconAlertTriangle size={14} stroke={2} />
                  Danger Zone
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Deleting a draft program is permanent and cannot be undone.
                </div>
              </div>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    Are you sure?
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <IconTrash size={12} stroke={2} />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Program
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}