import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getStatsForUser } from "./projects";

export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

export const checkUsernameAvailable = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        if (!args.username || args.username.length < 3) return false;
        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .unique();
        return existing === null;
    },
});

export const createBuilderProfile = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        username: v.string(),
        avatar: v.optional(v.string()),
        bio: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
        github: v.optional(v.string()),
        twitter: v.optional(v.string()),
        website: v.optional(v.string()),
        walletAddress: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
                roles: ["builder"],
                activeRole: "builder",
                onboardingComplete: true,
                updatedAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("users", {
            ...args,
            roles: ["builder"],
            activeRole: "builder",
            onboardingComplete: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const createManagerProfile = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        username: v.string(),
        avatar: v.optional(v.string()),
        orgName: v.string(),
        orgSlug: v.string(),
        orgDescription: v.string(),
        orgWebsite: v.optional(v.string()),
        orgLogo: v.optional(v.string()),
        orgTwitter: v.optional(v.string()),
        orgGithub: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const {
            orgName, orgSlug, orgDescription,
            orgWebsite, orgLogo, orgTwitter, orgGithub,
            ...userArgs
        } = args;

        let userId;
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...userArgs,
                roles: ["manager"],
                activeRole: "manager",
                onboardingComplete: true,
                updatedAt: Date.now(),
            });
            userId = existing._id;
        } else {
            userId = await ctx.db.insert("users", {
                ...userArgs,
                roles: ["manager"],
                activeRole: "manager",
                onboardingComplete: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        const orgId = await ctx.db.insert("organizations", {
            managerId: userId,
            name: orgName,
            slug: orgSlug,
            description: orgDescription,
            website: orgWebsite,
            logo: orgLogo,
            twitter: orgTwitter,
            github: orgGithub,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { userId, orgId };
    },
});

/**
 * Add the manager role to an existing Builder — called from the
 * in-dashboard "Become a Program Manager" modal.
 */
export const addManagerRole = mutation({
    args: {
        orgName: v.string(),
        orgSlug: v.string(),
        orgDescription: v.string(),
        orgWebsite: v.optional(v.string()),
        orgTwitter: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const updatedRoles: Array<"builder" | "manager"> = user.roles.includes("manager")
            ? user.roles
            : [...user.roles, "manager"];

        await ctx.db.patch(user._id, {
            roles: updatedRoles,
            activeRole: "manager",
            updatedAt: Date.now(),
        });

        await ctx.db.insert("organizations", {
            managerId: user._id,
            name: args.orgName,
            slug: args.orgSlug,
            description: args.orgDescription,
            website: args.orgWebsite,
            twitter: args.orgTwitter,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

/**
 * Switch the active role for users who have both Builder and Manager roles.
 */
export const switchActiveRole = mutation({
    args: {
        role: v.union(v.literal("builder"), v.literal("manager")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");
        if (!user.roles.includes(args.role)) throw new Error("Role not available");

        await ctx.db.patch(user._id, {
            activeRole: args.role,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Add the builder role to an existing Manager — called from the
 * in-dashboard "Join as a Builder" button.
 *
 * Unlike addManagerRole, builders don't need an organization,
 * so no extra setup is required — just append the role and switch.
 */
export const addBuilderRole = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const updatedRoles: Array<"builder" | "manager"> = user.roles.includes("builder")
            ? user.roles
            : [...user.roles, "builder"];

        await ctx.db.patch(user._id, {
            roles: updatedRoles,
            activeRole: "builder",
            updatedAt: Date.now(),
        });
    },
});

export const getByUsername = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .unique();

        if (!user) return null;

        const stats = await getStatsForUser(ctx, user._id);
        return { user, stats };
    },
});