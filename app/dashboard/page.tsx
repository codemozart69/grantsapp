"use client";

import { useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
    const { user } = useUser();
    const router = useRouter();
    const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

    // Skip query entirely until Convex auth token is established —
    // this prevents the null flash that causes the bounce-back bug.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUser = useQuery(
        (api as any).users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.replace("/"); return; }
        if (currentUser === undefined) return; // still loading
        if (currentUser === null || !currentUser.onboardingComplete) {
            router.replace("/onboarding");
        }
    }, [isAuthLoading, isAuthenticated, currentUser, router]);

    const isLoading = isAuthLoading || (isAuthenticated && currentUser === undefined);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Loading...
                </div>
            </div>
        );
    }

    if (!currentUser?.onboardingComplete) return null;

    return (
        <div className="mx-auto max-w-2xl px-6 py-12">
            <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                    Welcome,{" "}
                    {currentUser?.name?.split(" ")[0] || user?.firstName || "there"} 👋
                </h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser?.role === "builder"
                        ? "Your builder profile is live. Start exploring grant programs."
                        : "Your organization is set up. You're ready to launch grant programs."}
                </p>
            </div>

            <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                    Dashboard coming soon — this is your home base for{" "}
                    {currentUser?.role === "builder"
                        ? "tracking applications and milestones"
                        : "managing programs and reviewing applications"}
                    .
                </p>
            </div>
        </div>
    );
}