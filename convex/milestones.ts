import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgMember } from "./lib/auth";
import { logActivity } from "./activityLogs";
import { createNotification } from "./notifications";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List milestones for the authenticated builder.
 */
export const listMine = query({
    args: {
        status: v.optional(
            v.union(
                v.literal("pending"),
                v.literal("in_progress"),
                v.literal("submitted"),
                v.literal("approved"),
                v.literal("rejected"),
                v.literal("revision_requested")
            )
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return [];

        let milestones = await ctx.db
            .query("milestones")
            .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
            .collect();

        if (args.status) {
            milestones = milestones.filter((m) => m.status === args.status);
        }

        return await Promise.all(
            milestones
                .sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity))
                .map(async (m) => {
                    const program = await ctx.db.get(m.programId);
                    const application = await ctx.db.get(m.applicationId);
                    return { ...m, program, application };
                })
        );
    },
});

/**
 * List milestones pending review for a manager's programs.
 */
export const listPendingReview = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        const programs = await ctx.db
            .query("programs")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        const programIds = new Set(programs.map((p) => p._id));

        const submitted = await ctx.db
            .query("milestones")
            .withIndex("by_status", (q) => q.eq("status", "submitted"))
            .collect();

        const relevant = submitted.filter((m) => programIds.has(m.programId));

        return await Promise.all(
            relevant.map(async (m) => {
                const applicant = await ctx.db.get(m.applicantId);
                const program = await ctx.db.get(m.programId);
                const application = await ctx.db.get(m.applicationId);
                return { ...m, applicant, program, application };
            })
        );
    },
});

/**
 * List milestones for a specific application.
 */
export const listByApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_application", (q) =>
                q.eq("applicationId", args.applicationId)
            )
            .collect();

        return milestones.sort((a, b) => a.order - b.order);
    },
});

/**
 * Get a single milestone by ID.
 */
export const getById = query({
    args: { milestoneId: v.id("milestones") },
    handler: async (ctx, args) => {
        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone) return null;

        const applicant = await ctx.db.get(milestone.applicantId);
        const program = await ctx.db.get(milestone.programId);
        const application = await ctx.db.get(milestone.applicationId);
        const reviewer = milestone.reviewedBy
            ? await ctx.db.get(milestone.reviewedBy)
            : null;

        return { ...milestone, applicant, program, application, reviewer };
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a milestone for an approved application.
 * Called internally when an application is approved, or by the manager.
 */
export const create = mutation({
    args: {
        applicationId: v.id("applications"),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        deliverables: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");
        if (application.status !== "approved" && application.status !== "draft") {
            throw new Error("Milestones can only be created for approved or draft applications");
        }

        const program = await ctx.db.get(application.programId);
        if (!program) throw new Error("Program not found");

        // Must be the applicant or an org member
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const isApplicant = application.applicantId === user._id;
        if (!isApplicant) {
            // Must be an org member
            await requireOrgMember(ctx, program.organizationId, "reviewer");
        }

        const milestoneId = await ctx.db.insert("milestones", {
            applicationId: args.applicationId,
            programId: application.programId,
            applicantId: application.applicantId,
            title: args.title,
            description: args.description,
            deliverables: args.deliverables,
            amount: args.amount,
            order: args.order,
            dueDate: args.dueDate,
            status: "pending",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return milestoneId;
    },
});

/**
 * Update a milestone's details (manager only).
 */
export const update = mutation({
    args: {
        milestoneId: v.id("milestones"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        deliverables: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone) throw new Error("Milestone not found");

        const program = await ctx.db.get(milestone.programId);
        if (!program) throw new Error("Program not found");

        await requireOrgMember(ctx, program.organizationId, "reviewer");

        const { milestoneId: _milestoneId, ...fields } = args;
        const updates = Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(args.milestoneId, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Builder marks a milestone as in_progress.
 */
export const startProgress = mutation({
    args: { milestoneId: v.id("milestones") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const milestone = await ctx.db.get(args.milestoneId);

        if (!milestone) throw new Error("Milestone not found");
        if (milestone.applicantId !== user._id) {
            throw new Error("You don't own this milestone");
        }
        if (milestone.status !== "pending") {
            throw new Error("Milestone must be 'pending' to start progress");
        }

        await ctx.db.patch(args.milestoneId, {
            status: "in_progress",
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            programId: milestone.programId,
            applicationId: milestone.applicationId,
            milestoneId: args.milestoneId,
            action: "milestone.started",
            description: `Started milestone "${milestone.title}"`,
        });
    },
});

/**
 * Builder submits a milestone for review.
 */
export const submit = mutation({
    args: {
        milestoneId: v.id("milestones"),
        submissionNotes: v.optional(v.string()),
        submissionLinks: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const milestone = await ctx.db.get(args.milestoneId);

        if (!milestone) throw new Error("Milestone not found");
        if (milestone.applicantId !== user._id) {
            throw new Error("You don't own this milestone");
        }
        if (!["pending", "in_progress", "revision_requested"].includes(milestone.status)) {
            throw new Error("This milestone cannot be submitted");
        }

        await ctx.db.patch(args.milestoneId, {
            status: "submitted",
            submissionNotes: args.submissionNotes,
            submissionLinks: args.submissionLinks,
            submittedAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Notify program manager
        const program = await ctx.db.get(milestone.programId);
        if (program) {
            await createNotification(ctx, {
                userId: program.createdBy,
                type: "milestone_submitted",
                title: "Milestone Submitted for Review",
                message: `"${milestone.title}" was submitted for review`,
                programId: milestone.programId,
                applicationId: milestone.applicationId,
                milestoneId: args.milestoneId,
            });
        }

        await logActivity(ctx, {
            userId: user._id,
            programId: milestone.programId,
            applicationId: milestone.applicationId,
            milestoneId: args.milestoneId,
            action: "milestone.submitted",
            description: `Submitted milestone "${milestone.title}" for review`,
        });
    },
});

/**
 * Manager reviews a submitted milestone.
 */
export const review = mutation({
    args: {
        milestoneId: v.id("milestones"),
        decision: v.union(
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("revision_requested")
        ),
        reviewNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone) throw new Error("Milestone not found");

        const program = await ctx.db.get(milestone.programId);
        if (!program) throw new Error("Program not found");

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "reviewer"
        );

        if (milestone.status !== "submitted") {
            throw new Error("Milestone must be 'submitted' to review");
        }

        const statusMap = {
            approved: "approved" as const,
            rejected: "rejected" as const,
            revision_requested: "revision_requested" as const,
        };

        await ctx.db.patch(args.milestoneId, {
            status: statusMap[args.decision],
            reviewNotes: args.reviewNotes,
            reviewedBy: user._id,
            reviewedAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Notify the builder
        const notifTitle =
            args.decision === "approved"
                ? "Milestone Approved! 🎉"
                : args.decision === "rejected"
                    ? "Milestone Rejected"
                    : "Revision Requested";

        const notifMessage =
            args.decision === "approved"
                ? `Your milestone "${milestone.title}" was approved`
                : args.decision === "rejected"
                    ? `Your milestone "${milestone.title}" was rejected`
                    : `Revision requested for "${milestone.title}"`;

        await createNotification(ctx, {
            userId: milestone.applicantId,
            type: `milestone_${args.decision}`,
            title: notifTitle,
            message: notifMessage,
            programId: milestone.programId,
            applicationId: milestone.applicationId,
            milestoneId: args.milestoneId,
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: milestone.programId,
            applicationId: milestone.applicationId,
            milestoneId: args.milestoneId,
            action: `milestone.${args.decision}`,
            description: `${args.decision === "approved" ? "Approved" : args.decision === "rejected" ? "Rejected" : "Requested revision for"} milestone "${milestone.title}"`,
        });
    },
});