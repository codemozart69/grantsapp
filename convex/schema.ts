import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Existing tables ────────────────────────────────────────────────────────

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    username: v.string(),
    avatar: v.optional(v.string()),

    roles: v.array(v.union(v.literal("builder"), v.literal("manager"))),
    activeRole: v.union(v.literal("builder"), v.literal("manager")),
    onboardingComplete: v.boolean(),

    // Builder-specific fields
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    github: v.optional(v.string()),
    twitter: v.optional(v.string()),
    website: v.optional(v.string()),
    walletAddress: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_username", ["username"]),

  organizations: defineTable({
    managerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.string(),
    twitter: v.optional(v.string()),
    github: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_manager", ["managerId"])
    .index("by_slug", ["slug"]),

  // ─── New tables ─────────────────────────────────────────────────────────────

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("reviewer")
    ),
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("removed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  programs: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),

    name: v.string(),
    slug: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),

    mechanism: v.union(v.literal("direct"), v.literal("milestone")),

    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("closed"),
      v.literal("completed")
    ),

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

    // Denormalized stats
    applicationCount: v.number(),
    approvedCount: v.number(),
    totalAllocated: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  projects: defineTable({
    ownerId: v.id("users"),

    name: v.string(),
    slug: v.string(),
    description: v.string(),
    logo: v.optional(v.string()),
    coverImage: v.optional(v.string()),

    website: v.optional(v.string()),
    github: v.optional(v.string()),
    twitter: v.optional(v.string()),
    demoUrl: v.optional(v.string()),

    categories: v.optional(v.array(v.string())),
    ecosystems: v.optional(v.array(v.string())),
    teamMembers: v.optional(v.array(v.string())),

    // Denormalized stats
    applicationCount: v.number(),
    grantCount: v.number(),
    totalFunded: v.number(),

    status: v.union(v.literal("active"), v.literal("archived")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  applications: defineTable({
    programId: v.id("programs"),
    applicantId: v.id("users"),
    projectId: v.optional(v.id("projects")),

    title: v.string(),
    description: v.string(),
    requestedAmount: v.optional(v.number()),
    proposedTimeline: v.optional(v.string()),
    teamDescription: v.optional(v.string()),
    relevantLinks: v.optional(v.array(v.string())),

    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("withdrawn")
    ),

    reviewNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),

    approvedAmount: v.optional(v.number()),

    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_program", ["programId"])
    .index("by_applicant", ["applicantId"])
    .index("by_status", ["status"])
    .index("by_program_status", ["programId", "status"]),

  milestones: defineTable({
    applicationId: v.id("applications"),
    programId: v.id("programs"),
    applicantId: v.id("users"),

    title: v.string(),
    description: v.string(),
    deliverables: v.optional(v.string()),
    amount: v.optional(v.number()),

    order: v.number(),
    dueDate: v.optional(v.number()),

    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("revision_requested")
    ),

    submissionNotes: v.optional(v.string()),
    submissionLinks: v.optional(v.array(v.string())),
    submittedAt: v.optional(v.number()),

    reviewNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_program", ["programId"])
    .index("by_applicant", ["applicantId"])
    .index("by_status", ["status"]),

  reviews: defineTable({
    applicationId: v.id("applications"),
    reviewerId: v.id("users"),
    programId: v.id("programs"),

    decision: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("request_changes")
    ),
    score: v.optional(v.number()),
    feedback: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_program", ["programId"]),

  activityLogs: defineTable({
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    programId: v.optional(v.id("programs")),
    applicationId: v.optional(v.id("applications")),
    milestoneId: v.optional(v.id("milestones")),

    action: v.string(),
    description: v.string(),
    metadata: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_org", ["organizationId", "createdAt"])
    .index("by_program", ["programId", "createdAt"]),

  notifications: defineTable({
    userId: v.id("users"),

    type: v.string(),
    title: v.string(),
    message: v.string(),

    linkUrl: v.optional(v.string()),

    programId: v.optional(v.id("programs")),
    applicationId: v.optional(v.id("applications")),
    milestoneId: v.optional(v.id("milestones")),

    read: v.boolean(),
    emailSent: v.boolean(),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),
});