import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Public builder profile — fetches user by username with their
 * projects, grant stats, and public social links.
 */
export const getBuilderByUsername = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .unique();

        if (!user) return null;

        // Only expose builders publicly
        if (!user.roles.includes("builder")) return null;

        // Their active projects
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .filter((q) => q.neq(q.field("status"), "archived"))
            .collect();

        // Their applications (only approved — for public trust signal)
        const allApplications = await ctx.db
            .query("applications")
            .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
            .collect();

        const approvedApplications = allApplications.filter(
            (a) => a.status === "approved"
        );

        // Hydrate approved applications with program names
        const grantsReceived = await Promise.all(
            approvedApplications.map(async (a) => {
                const program = await ctx.db.get(a.programId);
                const project = a.projectId ? await ctx.db.get(a.projectId) : null;
                return {
                    _id: a._id,
                    title: a.title,
                    approvedAmount: a.approvedAmount,
                    approvedAt: a.reviewedAt,
                    program: program ? { name: program.name, slug: program.slug } : null,
                    project: project ? { name: project.name, slug: project.slug } : null,
                };
            })
        );

        const totalEarned = approvedApplications.reduce(
            (sum, a) => sum + (a.approvedAmount ?? 0),
            0
        );

        return {
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            skills: user.skills,
            github: user.github,
            twitter: user.twitter,
            website: user.website,
            walletAddress: user.walletAddress,
            createdAt: user.createdAt,
            // Stats
            projectCount: projects.length,
            applicationCount: allApplications.length,
            grantCount: approvedApplications.length,
            totalEarned,
            // Related data
            projects: projects.sort((a, b) => b.grantCount - a.grantCount),
            grantsReceived: grantsReceived.sort(
                (a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0)
            ),
        };
    },
});