"use client";

import { useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import {
    ProgramForm,
    parseFormValues,
    type ProgramFormValues,
} from "@/components/dashboard/programs/program-form";

export default function NewProgramPage() {
    const router = useRouter();
    const { isAuthenticated } = useConvexAuth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myOrg = useQuery(
        (api as any).organizations.getMyOrg,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createProgram = useMutation((api as any).programs.create);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateStatus = useMutation((api as any).programs.updateStatus);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!myOrg && myOrg !== undefined) {
        // org loaded but is null — shouldn't normally happen
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">
                    Organization not found. Please contact support.
                </div>
            </div>
        );
    }

    /** Save as draft */
    const handleSaveDraft = async (values: ProgramFormValues) => {
        if (!myOrg) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const programId = await createProgram({
                organizationId: myOrg._id,
                ...parseFormValues(values),
            });
            router.push(`/dashboard/programs/${programId}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
            setIsSubmitting(false);
        }
    };

    /** Save and immediately publish */
    const handleSaveAndPublish = async (values: ProgramFormValues) => {
        if (!myOrg) return;
        setError(null);
        try {
            const programId = await createProgram({
                organizationId: myOrg._id,
                ...parseFormValues(values),
            });
            await updateStatus({ programId, status: "active" });
            router.push(`/dashboard/programs/${programId}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        }
    };

    return (
        <div className="flex flex-col gap-0 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/programs"
                    className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
                >
                    <IconChevronLeft size={13} stroke={2.5} />
                    Programs
                </Link>
                <h1 className="text-xl font-semibold">New Grant Program</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Configure your grant program. It will be saved as a draft until you
                    publish.
                </p>
            </div>

            {/* Form card */}
            <div className="rounded-xl border bg-card p-8 max-w-3xl">
                <ProgramForm
                    isSubmitting={isSubmitting}
                    onSubmit={handleSaveDraft}
                    submitLabel="Save as Draft"
                    secondarySubmit={{
                        label: "Save & Publish",
                        onSubmit: handleSaveAndPublish,
                    }}
                    onCancel={() => router.push("/dashboard/programs")}
                    error={error}
                />
            </div>
        </div>
    );
}