import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Resolves the authenticated user's Convex document.
 * Throws if unauthenticated or if no user record exists.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

    if (!user) throw new Error("User record not found");
    return user;
}

/**
 * Requires the authenticated user to have a specific role.
 */
export async function requireRole(
    ctx: QueryCtx | MutationCtx,
    role: "builder" | "manager"
) {
    const user = await requireAuth(ctx);
    if (!user.roles.includes(role)) {
        throw new Error(`You must have the '${role}' role to do this`);
    }
    return user;
}

/**
 * Requires the authenticated user to be a member of the given organization
 * with at least the specified role tier.
 *
 * Role hierarchy (lowest → highest): reviewer → admin → owner
 */
const ROLE_RANK: Record<string, number> = {
    reviewer: 1,
    admin: 2,
    owner: 3,
};

export async function requireOrgMember(
    ctx: QueryCtx | MutationCtx,
    organizationId: Id<"organizations">,
    minimumRole: "reviewer" | "admin" | "owner" = "reviewer"
) {
    const user = await requireAuth(ctx);

    // Check org exists
    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // The original creator (managerId on org) is implicitly the owner
    if (org.managerId === user._id) return { user, org, memberRole: "owner" as const };

    const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
            q.eq("organizationId", organizationId).eq("userId", user._id)
        )
        .unique();

    if (!membership || membership.status !== "active") {
        throw new Error("You are not a member of this organization");
    }

    if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
        throw new Error(
            `You need at least the '${minimumRole}' role in this organization`
        );
    }

    return { user, org, memberRole: membership.role };
}

/**
 * Returns the authenticated user's Convex document, or null if not found.
 * Does NOT throw — for use in queries that return null gracefully.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
}