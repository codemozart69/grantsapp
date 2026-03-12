import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgMember } from "./lib/auth";
import { logActivity } from "./activityLogs";
import { createNotification } from "./notifications";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List applications submitted by the authenticated user (builder view).
 */
export const listMine = query({
    args: {
        status: v.optional(
            v.union(
                v.literal("draft"),
                v.literal("submitted"),
                v.literal("under_review"),
                v.literal("approved"),
                v.literal("rejected"),
                v.literal("withdrawn")
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

        let applications = await ctx.db
            .query("applications")
            .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
            .collect();

        if (args.status) {
            applications = applications.filter((a) => a.status === args.status);
        }

        // Hydrate program info
        return await Promise.all(
            applications
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(async (a) => {
                    const program = await ctx.db.get(a.programId);
                    const project = a.projectId ? await ctx.db.get(a.projectId) : null;
                    return { ...a, program, project };
                })
        );
    },
});

/**
 * List applications for a program (manager view).
 */
export const listByProgram = query({
    args: {
        programId: v.id("programs"),
        status: v.optional(
            v.union(
                v.literal("draft"),
                v.literal("submitted"),
                v.literal("under_review"),
                v.literal("approved"),
                v.literal("rejected"),
                v.literal("withdrawn")
            )
        ),
    },
    handler: async (ctx, args) => {
        let applications;

        if (args.status) {
            applications = await ctx.db
                .query("applications")
                .withIndex("by_program_status", (q) =>
                    q.eq("programId", args.programId).eq("status", args.status!)
                )
                .collect();
        } else {
            applications = await ctx.db
                .query("applications")
                .withIndex("by_program", (q) => q.eq("programId", args.programId))
                .collect();
        }

        return await Promise.all(
            applications
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(async (a) => {
                    const applicant = await ctx.db.get(a.applicantId);
                    const project = a.projectId ? await ctx.db.get(a.projectId) : null;
                    return { ...a, applicant, project };
                })
        );
    },
});

/**
 * Get a single application by ID.
 */
export const getById = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) return null;

        const program = await ctx.db.get(application.programId);
        const applicant = await ctx.db.get(application.applicantId);
        const project = application.projectId
            ? await ctx.db.get(application.projectId)
            : null;
        const reviewer = application.reviewedBy
            ? await ctx.db.get(application.reviewedBy)
            : null;

        // Get milestones for this application
        const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_application", (q) =>
                q.eq("applicationId", args.applicationId)
            )
            .collect();

        return {
            ...application,
            program,
            applicant,
            project,
            reviewer,
            milestones: milestones.sort((a, b) => a.order - b.order),
        };
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a draft application.
 */
export const create = mutation({
    args: {
        programId: v.id("programs"),
        title: v.string(),
        description: v.string(),
        projectId: v.optional(v.id("projects")),
        requestedAmount: v.optional(v.number()),
        proposedTimeline: v.optional(v.string()),
        teamDescription: v.optional(v.string()),
        relevantLinks: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);

        const program = await ctx.db.get(args.programId);
        if (!program) throw new Error("Program not found");
        if (program.status !== "active") {
            throw new Error("This program is not currently accepting applications");
        }

        // Validate project ownership if provided
        if (args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (!project || project.ownerId !== user._id) {
                throw new Error("Project not found or not owned by you");
            }
        }

        const applicationId = await ctx.db.insert("applications", {
            ...args,
            applicantId: user._id,
            status: "draft",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Increment project application count
        if (args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (project) {
                await ctx.db.patch(args.projectId, {
                    applicationCount: project.applicationCount + 1,
                    updatedAt: Date.now(),
                });
            }
        }

        await logActivity(ctx, {
            userId: user._id,
            programId: args.programId,
            applicationId,
            action: "application.created",
            description: `Started application "${args.title}"`,
        });

        return applicationId;
    },
});

/**
 * Update a draft application.
 */
export const update = mutation({
    args: {
        applicationId: v.id("applications"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        requestedAmount: v.optional(v.number()),
        proposedTimeline: v.optional(v.string()),
        teamDescription: v.optional(v.string()),
        relevantLinks: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const application = await ctx.db.get(args.applicationId);

        if (!application) throw new Error("Application not found");
        if (application.applicantId !== user._id) {
            throw new Error("You don't own this application");
        }
        if (application.status !== "draft") {
            throw new Error("Only draft applications can be edited");
        }

        const { applicationId, ...fields } = args;
        const updates = Object.fromEntries(
            Object.entries(fields).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(args.applicationId, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Submit an application (draft → submitted).
 */
export const submit = mutation({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const application = await ctx.db.get(args.applicationId);

        if (!application) throw new Error("Application not found");
        if (application.applicantId !== user._id) {
            throw new Error("You don't own this application");
        }
        if (application.status !== "draft") {
            throw new Error("Only draft applications can be submitted");
        }

        const program = await ctx.db.get(application.programId);
        if (!program || program.status !== "active") {
            throw new Error("This program is no longer accepting applications");
        }

        await ctx.db.patch(args.applicationId, {
            status: "submitted",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Increment program application count
        await ctx.db.patch(application.programId, {
            applicationCount: program.applicationCount + 1,
            updatedAt: Date.now(),
        });

        // Notify the program managers
        await createNotification(ctx, {
            userId: program.createdBy,
            type: "application_submitted",
            title: "New Application Received",
            description: `A new application was submitted to "${program.name}"`,
            message: `"${application.title}" was submitted by @${user.username}`,
            programId: application.programId,
            applicationId: args.applicationId,
        });

        await logActivity(ctx, {
            userId: user._id,
            programId: application.programId,
            applicationId: args.applicationId,
            action: "application.submitted",
            description: `Submitted application "${application.title}"`,
        });
    },
});

/**
 * Withdraw an application (submitted → withdrawn).
 */
export const withdraw = mutation({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const application = await ctx.db.get(args.applicationId);

        if (!application) throw new Error("Application not found");
        if (application.applicantId !== user._id) {
            throw new Error("You don't own this application");
        }
        if (!["submitted", "under_review"].includes(application.status)) {
            throw new Error("This application cannot be withdrawn");
        }

        await ctx.db.patch(args.applicationId, {
            status: "withdrawn",
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            programId: application.programId,
            applicationId: args.applicationId,
            action: "application.withdrawn",
            description: `Withdrew application "${application.title}"`,
        });
    },
});

/**
 * Move an application to "under_review" (manager action).
 */
export const startReview = mutation({
    args: { applicationId: v.id("applications") },
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

        if (application.status !== "submitted") {
            throw new Error("Application must be 'submitted' to start review");
        }

        await ctx.db.patch(args.applicationId, {
            status: "under_review",
            updatedAt: Date.now(),
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: application.programId,
            applicationId: args.applicationId,
            action: "application.under_review",
            description: `Started reviewing "${application.title}"`,
        });
    },
});

/**
 * Approve or reject an application (manager action).
 */
export const review = mutation({
    args: {
        applicationId: v.id("applications"),
        decision: v.union(v.literal("approved"), v.literal("rejected")),
        reviewNotes: v.optional(v.string()),
        approvedAmount: v.optional(v.number()),
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

        await ctx.db.patch(args.applicationId, {
            status: args.decision,
            reviewNotes: args.reviewNotes,
            reviewedBy: user._id,
            reviewedAt: Date.now(),
            approvedAmount: args.approvedAmount,
            updatedAt: Date.now(),
        });

        // Update program stats if approved
        if (args.decision === "approved") {
            await ctx.db.patch(application.programId, {
                approvedCount: program.approvedCount + 1,
                totalAllocated:
                    program.totalAllocated + (args.approvedAmount ?? 0),
                updatedAt: Date.now(),
            });

            // Update project grant count
            if (application.projectId) {
                const project = await ctx.db.get(application.projectId);
                if (project) {
                    await ctx.db.patch(application.projectId, {
                        grantCount: project.grantCount + 1,
                        totalFunded: project.totalFunded + (args.approvedAmount ?? 0),
                        updatedAt: Date.now(),
                    });
                }
            }
        }

        // Notify the applicant
        await createNotification(ctx, {
            userId: application.applicantId,
            type: args.decision === "approved"
                ? "application_approved"
                : "application_rejected",
            title: args.decision === "approved"
                ? "Application Approved! 🎉"
                : "Application Update",
            message: args.decision === "approved"
                ? `Your application "${application.title}" was approved${args.approvedAmount ? ` for $${args.approvedAmount}` : ""}`
                : `Your application "${application.title}" was not approved this time`,
            programId: application.programId,
            applicationId: args.applicationId,
        });

        await logActivity(ctx, {
            userId: user._id,
            organizationId: program.organizationId,
            programId: application.programId,
            applicationId: args.applicationId,
            action: `application.${args.decision}`,
            description: `${args.decision === "approved" ? "Approved" : "Rejected"} application "${application.title}"`,
        });
    },
});