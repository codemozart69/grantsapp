"use client";

import { useEffect, useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { AddManagerRoleModal } from "@/components/add-manager-role-modal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
    const [showManagerModal, setShowManagerModal] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUser = useQuery(
        (api as any).users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.replace("/"); return; }
        if (currentUser === undefined) return;
        if (currentUser === null || !currentUser.onboardingComplete) {
            router.replace("/onboarding");
        }
    }, [isAuthLoading, isAuthenticated, currentUser, router]);

    const isLoading =
        isAuthLoading || (isAuthenticated && currentUser === undefined);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Loading...
                </div>
            </div>
        );
    }

    if (!currentUser?.onboardingComplete) return null;

    return (
        <>
            <div className="flex min-h-screen w-full">
                <DashboardSidebar
                    currentUser={currentUser}
                    onAddManagerRole={() => setShowManagerModal(true)}
                />

                {/* ── Main content ──────────────────────────────────────────── */}
                <main className="bg-background flex min-w-0 flex-1 flex-col overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Role upgrade modal */}
            <AddManagerRoleModal
                open={showManagerModal}
                onClose={() => setShowManagerModal(false)}
            />
        </>
    );
}