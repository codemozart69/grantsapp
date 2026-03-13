"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconUsers,
    IconPlus,
    IconTrash,
    IconShield,
    IconCrown,
    IconEye,
    IconAlertTriangle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ElementType; description: string; color: string }> = {
    owner: { label: "Owner", icon: IconCrown, description: "Full access — cannot be removed", color: "text-amber-600 dark:text-amber-400" },
    admin: { label: "Admin", icon: IconShield, description: "Can manage programs and review applications", color: "text-primary" },
    reviewer: { label: "Reviewer", icon: IconEye, description: "Can review applications — read only otherwise", color: "text-muted-foreground" },
};

function RoleBadge({ role }: { role: string }) {
    const meta = ROLE_META[role] ?? ROLE_META.reviewer;
    const Icon = meta.icon;
    return (
        <span className={cn("flex items-center gap-1 text-[11px] font-semibold", meta.color)}>
            <Icon size={11} stroke={2} />
            {meta.label}
        </span>
    );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
    member,
    isOwner: canManage,
    currentUserId,
    orgId,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    member: any;
    isOwner: boolean;
    currentUserId: string;
    orgId: string;
}) {
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [isChangingRole, setIsChangingRole] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateRole = useMutation((api as any).organizationMembers.updateMemberRole);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeMember = useMutation((api as any).organizationMembers.removeMember);

    const isMe = member.user?._id === currentUserId;
    const isOwnerMember = member.role === "owner";

    const handleRoleChange = async (newRole: "admin" | "reviewer") => {
        if (isChangingRole) return;
        setIsChangingRole(true);
        try {
            await updateRole({
                organizationId: orgId,
                memberId: member._id,
                role: newRole,
            });
        } finally {
            setIsChangingRole(false);
        }
    };

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await removeMember({ organizationId: orgId, memberId: member._id });
        } finally {
            setIsRemoving(false);
            setShowRemoveConfirm(false);
        }
    };

    return (
        <div className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
            {/* Avatar */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
                {(member.user?.name ?? member.user?.username ?? "?")[0]}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                        {member.user?.name ?? `@${member.user?.username}`}
                    </span>
                    {isMe && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary uppercase tracking-wide">
                            You
                        </span>
                    )}
                </div>
                <div className="text-[11px] text-muted-foreground">@{member.user?.username}</div>
            </div>

            {/* Role */}
            <div className="shrink-0">
                {!isOwnerMember && canManage && !isMe ? (
                    <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(e.target.value as "admin" | "reviewer")}
                        disabled={isChangingRole}
                        className="h-7 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="admin">Admin</option>
                        <option value="reviewer">Reviewer</option>
                    </select>
                ) : (
                    <RoleBadge role={member.role} />
                )}
            </div>

            {/* Remove */}
            {canManage && !isOwnerMember && !isMe && (
                <div className="shrink-0">
                    {showRemoveConfirm ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Remove?</span>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowRemoveConfirm(false)} disabled={isRemoving}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={handleRemove} disabled={isRemoving}>
                                {isRemoving ? "..." : "Remove"}
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowRemoveConfirm(true)}
                            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive cursor-pointer"
                        >
                            <IconTrash size={13} stroke={2} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Invite Form ──────────────────────────────────────────────────────────────

function InviteForm({ orgId }: { orgId: string }) {
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<"admin" | "reviewer">("reviewer");
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addMember = useMutation((api as any).organizationMembers.addMember);

    const handleInvite = async () => {
        if (!username.trim()) return;
        setError(null);
        setSuccess(null);
        setIsInviting(true);
        try {
            await addMember({ organizationId: orgId, username: username.trim(), role });
            setSuccess(`@${username.trim()} has been added to the team.`);
            setUsername("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to add member.");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="text-sm font-semibold">Add Team Member</div>

            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                <Field>
                    <FieldLabel>Username</FieldLabel>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@</span>
                        <Input
                            className="pl-6"
                            placeholder="their-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                        />
                    </div>
                </Field>

                <Field>
                    <FieldLabel>Role</FieldLabel>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "admin" | "reviewer")}
                        className="flex h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Admin</option>
                    </select>
                </Field>

                <Button size="sm" onClick={handleInvite} disabled={!username.trim() || isInviting} className="gap-1.5 mb-0.5">
                    <IconPlus size={12} stroke={2.5} />
                    {isInviting ? "Adding..." : "Add"}
                </Button>
            </div>

            {/* Role descriptions */}
            <div className="space-y-1.5">
                {["reviewer", "admin"].map((r) => (
                    <div key={r} className={cn("flex items-start gap-2 text-[11px]", role === r ? "text-foreground" : "text-muted-foreground opacity-60")}>
                        {r === "admin" ? <IconShield size={11} stroke={2} className="mt-0.5 shrink-0" /> : <IconEye size={11} stroke={2} className="mt-0.5 shrink-0" />}
                        <span><strong className="capitalize">{r}:</strong> {ROLE_META[r].description}</span>
                    </div>
                ))}
            </div>

            {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
            {success && <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">{success}</div>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { isAuthenticated } = useConvexAuth();

    const currentUser = useQuery(api.users.getCurrentUser, !isAuthenticated ? "skip" : undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myOrg = useQuery((api as any).organizations.getMyOrg, !isAuthenticated ? "skip" : undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamData = useQuery(
        (api as any).organizationMembers.listMembers,
        myOrg ? { organizationId: myOrg._id } : "skip"
    );

    const isLoading = currentUser === undefined || myOrg === undefined || teamData === undefined;
    const isOwner = myOrg?.managerId === currentUser?._id;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-8">
                <Skeleton className="h-7 w-24" />
                <div className="grid grid-cols-[1fr_320px] gap-6">
                    <div className="rounded-xl border">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
                                <Skeleton className="size-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-5 w-16" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!myOrg) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                    icon={IconUsers}
                    title="No organization found"
                    description="You need to be a manager with an organization to manage team members."
                />
            </div>
        );
    }

    const allMembers = [
        ...(teamData?.owner ? [{ ...teamData.owner, role: "owner" }] : []),
        ...(teamData?.members ?? []),
    ];

    return (
        <div className="flex flex-col gap-6 p-8">
            <div>
                <h1 className="text-xl font-semibold">Team</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage who can access and review applications for <strong>{myOrg.name}</strong>.
                </p>
            </div>

            <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
                {/* Members list */}
                <div className="rounded-xl border">
                    {allMembers.length === 0 ? (
                        <div className="p-10">
                            <EmptyState
                                icon={IconUsers}
                                title="No team members yet"
                                description="Add reviewers and admins to help manage your grant programs."
                            />
                        </div>
                    ) : (
                        allMembers.map((member: any) => (
                            <MemberRow
                                key={member._id}
                                member={member}
                                isOwner={isOwner}
                                currentUserId={currentUser?._id ?? ""}
                                orgId={myOrg._id}
                            />
                        ))
                    )}
                </div>

                {/* Right panel */}
                <div className="space-y-4">
                    {isOwner && <InviteForm orgId={myOrg._id} />}

                    {/* Role legend */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role Permissions</div>
                        {Object.entries(ROLE_META).map(([key, meta]) => {
                            const Icon = meta.icon;
                            return (
                                <div key={key} className="flex items-start gap-2.5">
                                    <Icon size={13} stroke={2} className={cn("mt-0.5 shrink-0", meta.color)} />
                                    <div>
                                        <div className={cn("text-[11px] font-semibold", meta.color)}>{meta.label}</div>
                                        <div className="text-[11px] text-muted-foreground">{meta.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {!isOwner && (
                        <div className="flex items-start gap-2 rounded-xl border bg-muted/30 p-4">
                            <IconAlertTriangle size={13} stroke={2} className="mt-0.5 shrink-0 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground">
                                Only the org owner can add or remove team members and change roles.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}