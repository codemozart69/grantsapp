import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgMember } from "./lib/auth";
import { toSlug, uniqueProgramSlug, isProgramSlugAvailable } from "./lib/slugs";
import { logActivity } from "./activityLogs";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all programs for a given organization (manager view).
 */
export const listByOrg = query({
    args: {
        organizationId: v.id("organizations"),
        status: v.optional(
            v.union(
                v.literal("draft"),
                v.literal("active"),
                v.literal("paused"),
                v.literal("closed"),
                v.literal("completed")
            )
        ),
    },
    handler: async (ctx, args) => {
        let programs = await ctx.db
            .query("programs")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.status) {
            programs = programs.filter((p) => p.status === args.status);
        }

        return programs.sort((a, b) => b.createdAt - a.createdAt);
    },
});

/**
 * List all active programs (public explorer).
 */
export const listPublic = query({
    args: {
        limit: v.optional(v.number()),
        category: v.optional(v.string()),
        ecosystem: v.optional(v.string()),
        mechanism: v.optional(v.union(v.literal("direct"), v.literal("milestone"))),
    },
    handler: async (ctx, args) => {
        let programs = await ctx.db
            .query("programs")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        // Filter out unlisted programs
        programs = programs.filter((p) => p.visibility !== "unlisted");

        if (args.category) {
            programs = programs.filter((p) =>
                p.categories?.includes(args.category!)
            );
        }
        if (args.ecosystem) {
            programs = programs.filter((p) =>
                p.ecosystems?.includes(args.ecosystem!)
            );
        }
        if (args.mechanism) {
            programs = programs.filter((p) => p.mechanism === args.mechanism);
        }

        programs = programs.sort((a, b) => b.createdAt - a.createdAt);

        if (args.limit) programs = programs.slice(0, args.limit);

        // Hydrate org info for each program
        return await Promise.all(
            programs.map(async (p) => {
                const org = await ctx.db.get(p.organizationId);
                return { ...p, organization: org };
            })
        );
    },
});

/**
 * Get a single program by ID.
 */
export const getById = query({
    args: { programId: v.id("programs") },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program) return null;

        const org = await ctx.db.get(program.organizationId);
        return { ...program, organization: org };
    },
});

/**
 * Get a program by its slug (public).
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const program = await ctx.db
            .query("programs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();

        if (!program) return null;

        const org = await ctx.db.get(program.organizationId);
        return { ...program, organization: org };
    },
});

/**
 * Check if a program slug is available.
 */
export const checkSlugAvailable = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        if (!args.slug || args.slug.length < 2) return false;
        return await isProgramSlugAvailable(ctx, args.slug);
    },
});

/**
 * Get summary stats for a manager's org (used on dashboard overview).
 */
export const getOrgStats = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        const programs = await ctx.db
            .query("programs")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        const activePrograms = programs.filter((p) => p.status === "active");
        const totalAllocated = programs.reduce((sum, p) => sum + p.totalAllocated, 0);
        const totalApproved = programs.reduce((sum, p) => sum + p.approvedCount, 0);

        // Count applications pending review across all org programs
        const programIds = programs.map((p) => p._id);
        let pendingReviewCount = 0;
        for (const pid of programIds) {
            const submitted = await ctx.db
                .query("applications")
                .withIndex("by_program_status", (q) =>
                    q.eq("programId", pid).eq("status", "submitted")
                )
                .collect();
            const underReview = await ctx.db
                .query("applications")
                .withIndex("by_program_status", (q) =>
                    q.eq("programId", pid).eq("status", "under_review")
                )
                .collect();
            pendingReviewCount += submitted.length + underReview.length;
        }

        return {
            activeProgramCount: activePrograms.length,
            totalProgramCount: programs.length,
            pendingReviewCount,
            totalAllocated,
            totalApproved,
        };
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new grant program.
 */
export const create = mutation({
    args: {
        organizationId: v.id("organizations"),
        name: v.string(),
        description: v.string(),
        mechanism: v.union(v.literal("direct"), v.literal("milestone")),
        slug: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        budget: v.optional(v.number()),
        currency: v.optional(v.string()),
        maxGrantAmount: v.optional(v.number()),
        eligibilityCriteria: v.optional(v.string()),
        applicationRequirements: v.optional(v.string()),
        applicationStartDate: v.optional(v.number()),
        applicationEndDate: v.optional(v.number()),
        reviewStartDate: v.optional(v.number()),
        reviewEndDate: v.optional(v.number()),
        categories: v.optional(v.array(v.string())),
        ecosystems: v.optional(v.array(v.string())),
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"))),
        customQuestions: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    type: v.union(v.literal("text"), v.literal("long_text"), v.literal("link"), v.literal("single_choice")),
                    question: v.string(),
                    required: v.boolean(),
                    options: v.optional(v.array(v.string())),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        const { user } = await requireOrgMember(ctx, args.organizationId, "admin");

        const baseSlug = args.slug
            ? toSlug(args.slug)
            : toSlug(args.name);
        const slug = await uniqueProgramSlug(ctx, baseSlug);

        const { slug: _ignoredSlug, ...rest } = args;

        const programId = await ctx.db.insert("programs", {
            ...rest,
            slug,
            createdBy: user._id,
            status: "draft",
            applicationCount: 0,
            approvedCount: 0,
            totalAllocated: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: args.organizationId,
            programId,
            action: "program.created",
            description: `Created program "${args.name}"`,
        });

        return programId;
    },
});

/**
 * Update program details.
 */
export const update = mutation({
    args: {
        programId: v.id("programs"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        budget: v.optional(v.number()),
        currency: v.optional(v.string()),
        maxGrantAmount: v.optional(v.number()),
        eligibilityCriteria: v.optional(v.string()),
        applicationRequirements: v.optional(v.string()),
        applicationStartDate: v.optional(v.number()),
        applicationEndDate: v.optional(v.number()),
        reviewStartDate: v.optional(v.number()),
        reviewEndDate: v.optional(v.number()),
        categories: v.optional(v.array(v.string())),
        ecosystems: v.optional(v.array(v.string())),
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"))),
    },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program) throw new Error("Program not found");

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "admin"
        );

        const { programId, ...fields } = args;
        const updates = Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(args.programId, { ...updates, updatedAt: Date.now() });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: args.programId,
            action: "program.updated",
            description: `Updated program "${program.name}"`,
        });
    },
});

/**
 * Record a deployed FVM vault address for a program.
 */
export const setVaultAddress = mutation({
    args: {
        programId: v.id("programs"),
        vaultAddress: v.string(),
        vaultChainId: v.number(),
    },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program) throw new Error("Program not found");

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "admin"
        );

        await ctx.db.patch(args.programId, {
            vaultAddress: args.vaultAddress,
            vaultChainId: args.vaultChainId,
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: args.programId,
            action: "program.vault_deployed",
            description: `Deployed FVM Vault for program "${program.name}"`,
        });
    },
});

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft: ["active"],
    active: ["paused", "closed"],
    paused: ["active", "closed"],
    closed: ["completed"],
    completed: [],
};

/**
 * Change a program's status (publish, pause, close, complete).
 */
export const updateStatus = mutation({
    args: {
        programId: v.id("programs"),
        status: v.union(
            v.literal("draft"),
            v.literal("active"),
            v.literal("paused"),
            v.literal("closed"),
            v.literal("completed")
        ),
    },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program) throw new Error("Program not found");

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "admin"
        );

        const allowed = ALLOWED_TRANSITIONS[program.status] ?? [];
        if (!allowed.includes(args.status)) {
            throw new Error(
                `Cannot transition from '${program.status}' to '${args.status}'`
            );
        }

        await ctx.db.patch(args.programId, {
            status: args.status,
            updatedAt: Date.now(),
        });

        const actionMap: Record<string, string> = {
            active: "program.published",
            paused: "program.paused",
            closed: "program.closed",
            completed: "program.completed",
        };

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: args.programId,
            action: actionMap[args.status] ?? "program.status_changed",
            description: `Program "${program.name}" is now ${args.status}`,
        });
    },
});

/**
 * Delete a program. Only allowed when status is "draft".
 */
export const deleteProgram = mutation({
    args: {
        programId: v.id("programs"),
    },
    handler: async (ctx, args) => {
        const program = await ctx.db.get(args.programId);
        if (!program) throw new Error("Program not found");

        if (program.status !== "draft") {
            throw new Error("Only draft programs can be deleted");
        }

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "admin"
        );

        await ctx.db.delete(args.programId);

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            action: "program.deleted",
            description: `Deleted program "${program.name}"`,
        });
    },
});