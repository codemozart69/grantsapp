import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./lib/auth";
import { logActivity } from "./activityLogs";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get all reviews for a specific application.
 */
export const listByApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_application", (q) =>
                q.eq("applicationId", args.applicationId)
            )
            .collect();

        return await Promise.all(
            reviews.map(async (r) => {
                const reviewer = await ctx.db.get(r.reviewerId);
                return { ...r, reviewer };
            })
        );
    },
});

/**
 * Get all reviews submitted by the current reviewer for a program.
 */
export const listByReviewer = query({
    args: {
        programId: v.id("programs"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("reviews")
            .withIndex("by_reviewer", (q) => q.eq("reviewerId", user._id))
            .filter((q) => q.eq(q.field("programId"), args.programId))
            .collect();
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Submit a review for an application.
 */
export const create = mutation({
    args: {
        applicationId: v.id("applications"),
        decision: v.union(
            v.literal("approve"),
            v.literal("reject"),
            v.literal("request_changes")
        ),
        feedback: v.string(),
        score: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");

        const program = await ctx.db.get(application.programId);
        if (!program) throw new Error("Program not found");

        const { user } = await requireOrgMember(
            ctx,
            program.organizationId,
            "reviewer"
        );

        if (!["submitted", "under_review"].includes(application.status)) {
            throw new Error("Application is not in a reviewable state");
        }

        // Validate score range if provided
        if (args.score !== undefined && (args.score < 1 || args.score > 10)) {
            throw new Error("Score must be between 1 and 10");
        }

        // Prevent duplicate reviews from the same reviewer
        const existingReview = await ctx.db
            .query("reviews")
            .withIndex("by_application", (q) =>
                q.eq("applicationId", args.applicationId)
            )
            .filter((q) => q.eq(q.field("reviewerId"), user._id))
            .unique();

        if (existingReview) {
            // Update existing review
            await ctx.db.patch(existingReview._id, {
                decision: args.decision,
                feedback: args.feedback,
                score: args.score,
                updatedAt: Date.now(),
            });

            return existingReview._id;
        }

        const reviewId = await ctx.db.insert("reviews", {
            applicationId: args.applicationId,
            reviewerId: user._id,
            programId: application.programId,
            decision: args.decision,
            feedback: args.feedback,
            score: args.score,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: application.programId,
            applicationId: args.applicationId,
            action: "review.submitted",
            description: `Submitted review with decision: ${args.decision}`,
        });

        return reviewId;
    },
});

/**
 * Update an existing review.
 */
export const update = mutation({
    args: {
        reviewId: v.id("reviews"),
        decision: v.optional(
            v.union(
                v.literal("approve"),
                v.literal("reject"),
                v.literal("request_changes")
            )
        ),
        feedback: v.optional(v.string()),
        score: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!user) throw new Error("User not found");

        const review = await ctx.db.get(args.reviewId);
        if (!review) throw new Error("Review not found");
        if (review.reviewerId !== user._id) {
            throw new Error("You can only edit your own reviews");
        }

        if (args.score !== undefined && (args.score < 1 || args.score > 10)) {
            throw new Error("Score must be between 1 and 10");
        }

        const { reviewId, ...fields } = args;
        const updates = Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(args.reviewId, { ...updates, updatedAt: Date.now() });
    },
});