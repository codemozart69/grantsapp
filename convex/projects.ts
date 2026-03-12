import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { toSlug, uniqueProjectSlug, isProjectSlugAvailable } from "./lib/slugs";
import { logActivity } from "./activityLogs";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all projects owned by the authenticated user.
 */
export const listMine = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .filter((q) => q.neq(q.field("status"), "archived"))
            .collect();
    },
});

/**
 * List all active projects (public explorer).
 */
export const listPublic = query({
    args: {
        limit: v.optional(v.number()),
        category: v.optional(v.string()),
        ecosystem: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let projects = await ctx.db
            .query("projects")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        if (args.category) {
            projects = projects.filter((p) => p.categories?.includes(args.category!));
        }
        if (args.ecosystem) {
            projects = projects.filter((p) => p.ecosystems?.includes(args.ecosystem!));
        }

        projects = projects.sort((a, b) => b.createdAt - a.createdAt);
        if (args.limit) projects = projects.slice(0, args.limit);

        return await Promise.all(
            projects.map(async (p) => {
                const owner = await ctx.db.get(p.ownerId);
                return { ...p, owner };
            })
        );
    },
});

/**
 * Get a single project by ID.
 */
export const getById = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) return null;

        const owner = await ctx.db.get(project.ownerId);
        return { ...project, owner };
    },
});

/**
 * Get a project by slug (public).
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const project = await ctx.db
            .query("projects")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        if (!project) return null;
        const owner = await ctx.db.get(project.ownerId);
        return { ...project, owner };
    },
});

/**
 * Check if a project slug is available.
 */
export const checkSlugAvailable = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        if (!args.slug || args.slug.length < 2) return false;
        return await isProjectSlugAvailable(ctx, args.slug);
    },
});

/**
 * Get builder dashboard stats.
 */
export const getBuilderStats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return null;

        const applications = await ctx.db
            .query("applications")
            .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
            .collect();

        const activeGrants = applications.filter((a) => a.status === "approved");
        const totalEarned = activeGrants.reduce(
            (sum, a) => sum + (a.approvedAmount ?? 0),
            0
        );

        // Count milestones due this month
        const now = Date.now();
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
            .collect();

        const milestonesThisMonth = milestones.filter(
            (m) =>
                m.dueDate &&
                m.dueDate >= now &&
                m.dueDate <= endOfMonth.getTime() &&
                (m.status === "pending" || m.status === "in_progress")
        );

        return {
            applicationCount: applications.length,
            activeGrantCount: activeGrants.length,
            milestoneDueCount: milestonesThisMonth.length,
            totalEarned,
        };
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new project.
 */
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        slug: v.optional(v.string()),
        logo: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        website: v.optional(v.string()),
        github: v.optional(v.string()),
        twitter: v.optional(v.string()),
        demoUrl: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        ecosystems: v.optional(v.array(v.string())),
        teamMembers: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        const baseSlug = args.slug ? toSlug(args.slug) : toSlug(args.name);
        const slug = await uniqueProjectSlug(ctx, baseSlug);

        const { slug: _ignoredSlug, ...rest } = args;

        const projectId = await ctx.db.insert("projects", {
            ...rest,
            slug,
            ownerId: user._id,
            applicationCount: 0,
            grantCount: 0,
            totalFunded: 0,
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            action: "project.created",
            description: `Created project "${args.name}"`,
        });

        return projectId;
    },
});

/**
 * Update a project.
 */
export const update = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        website: v.optional(v.string()),
        github: v.optional(v.string()),
        twitter: v.optional(v.string()),
        demoUrl: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        ecosystems: v.optional(v.array(v.string())),
        teamMembers: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const project = await ctx.db.get(args.projectId);

        if (!project) throw new Error("Project not found");
        if (project.ownerId !== user._id) {
            throw new Error("You don't own this project");
        }

        const { projectId, ...fields } = args;
        const updates = Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(args.projectId, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Archive a project.
 */
export const archive = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const project = await ctx.db.get(args.projectId);

        if (!project) throw new Error("Project not found");
        if (project.ownerId !== user._id) throw new Error("You don't own this project");

        await ctx.db.patch(args.projectId, {
            status: "archived",
            updatedAt: Date.now(),
        });
    },
});