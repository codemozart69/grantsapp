# GrantsApp — Implementation Plan

> Comprehensive, phased plan for building the GrantsApp hackathon MVP.  
> Use this document alongside `docs/project-idea.md` to provide context in new chat sessions.  
> **Last updated:** 2026-03-12

---

## Current State

### What's Already Built

| Layer | Status | Details |
|---|---|---|
| **Auth & Identity** | ✅ Complete | Clerk authentication, protected routes via middleware (`proxy.ts`), ConvexProviderWithClerk |
| **Onboarding** | ✅ Complete | Multi-step flow: role selection → profile creation → org creation (manager only) |
| **User Schema** | ✅ Complete | `users` table with roles, activeRole, builder fields, social links |
| **Organization Schema** | ✅ Complete | `organizations` table with managerId, name, slug, branding fields |
| **Dashboard Layout** | ✅ Complete | Sidebar with role-aware navigation, role-switching popover, "Become a Manager" flow |
| **Dashboard Overview** | ✅ Complete | Builder & Manager overview pages with stat cards, empty states, activity feed (hardcoded) |
| **Dashboard Sub-Pages** | 🟡 Placeholder | `/programs`, `/applications`, `/milestones`, `/projects`, `/analytics`, `/team` — all render `ComingSoonPage` |
| **Public Routes** | 🟡 Placeholder | `/grants` and `/projects` routes referenced in nav but not built |
| **UI Components** | ✅ Complete | Button, Input, Textarea, Field, Card, Badge, DropdownMenu, Select, Combobox, AlertDialog, Label, Separator |

### Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Backend:** Convex (functions + database)
- **Auth:** Clerk v7 (with Convex JWT integration)
- **UI:** shadcn ui + Custom components + @tabler/icons-react + Base UI + CVA + clsx + tailwind-merge
- **Package manager:** pnpm

---

## Architecture Principles

These principles should guide all implementation decisions:

1. **Schema-first development** — define Convex tables, indexes, and validators before writing UI
2. **Convex functions as the API layer** — all business logic lives in queries/mutations/actions, never in components
3. **Role-aware everything** — every dashboard feature must respect `activeRole` and authorization checks
4. **Mechanism abstraction** — programs reference a `mechanism` type so new funding models plug in later
5. **Progressive enhancement** — Web2 first, Web3 integrations layered on after MVP is functional

---

## Schema Design

This is the **full schema** needed for the MVP. Existing tables (`users`, `organizations`) are shown with proposed additions.

### `users` (existing — no changes needed)

Already has: clerkId, email, name, username, avatar, roles, activeRole, onboardingComplete, builder fields, timestamps.

### `organizations` (existing — add member support)

Add a separate `organizationMembers` table to support team features.

### `organizationMembers` (NEW)

```
organizationMembers {
  organizationId: Id<"organizations">
  userId: Id<"users">
  role: "owner" | "admin" | "reviewer"
  invitedBy: Id<"users">
  status: "active" | "invited" | "removed"
  createdAt: number
  updatedAt: number
}
indexes: by_org [organizationId], by_user [userId], by_org_user [organizationId, userId]
```

### `programs` (NEW)

```
programs {
  organizationId: Id<"organizations">
  createdBy: Id<"users">

  // Core info
  name: string
  slug: string
  description: string                        // rich text / markdown
  coverImage?: string

  // Mechanism
  mechanism: "direct" | "milestone"          // expandable later with "quadratic", "retroactive", etc.

  // Lifecycle
  status: "draft" | "active" | "paused" | "closed" | "completed"

  // Configuration
  budget?: number                            // total budget in USD (or token equivalent)
  currency?: string                          // "USD", "FIL", "ETH", etc.
  maxGrantAmount?: number                    // per-application cap
  eligibilityCriteria?: string               // markdown
  applicationRequirements?: string           // markdown — what builders must submit

  // Timeline
  applicationStartDate?: number
  applicationEndDate?: number
  reviewStartDate?: number
  reviewEndDate?: number

  // Categories / tags for discovery
  categories?: string[]                      // e.g. ["DeFi", "Infrastructure", "Public Goods"]
  ecosystems?: string[]                      // e.g. ["Filecoin", "Ethereum"]

  // Stats (denormalized for fast reads)
  applicationCount: number
  approvedCount: number
  totalAllocated: number

  createdAt: number
  updatedAt: number
}
indexes: by_org [organizationId], by_slug [slug], by_status [status]
```

### `applications` (NEW)

```
applications {
  programId: Id<"programs">
  applicantId: Id<"users">
  projectId?: Id<"projects">                // link to the builder's project profile

  // Application content
  title: string
  description: string                        // what they want to build
  requestedAmount?: number
  proposedTimeline?: string
  teamDescription?: string
  relevantLinks?: string[]                   // repos, demos, etc.

  // Status
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn"
  
  // Review summary written by reviewer
  reviewNotes?: string
  reviewedBy?: Id<"users">
  reviewedAt?: number

  // Funding (set when approved)
  approvedAmount?: number

  submittedAt?: number
  createdAt: number
  updatedAt: number
}
indexes: by_program [programId], by_applicant [applicantId], by_status [status], by_program_status [programId, status]
```

### `milestones` (NEW)

```
milestones {
  applicationId: Id<"applications">
  programId: Id<"programs">
  applicantId: Id<"users">

  // Content
  title: string
  description: string
  deliverables?: string                      // what exactly should be submitted
  amount?: number                            // payment released on completion

  // Ordering & timeline
  order: number                              // 1, 2, 3...
  dueDate?: number

  // Status
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "revision_requested"

  // Submission
  submissionNotes?: string
  submissionLinks?: string[]
  submittedAt?: number

  // Review
  reviewNotes?: string
  reviewedBy?: Id<"users">
  reviewedAt?: number

  createdAt: number
  updatedAt: number
}
indexes: by_application [applicationId], by_program [programId], by_applicant [applicantId], by_status [status]
```

### `projects` (NEW)

Builder-created project profiles — a reusable identity across multiple grant applications.

```
projects {
  ownerId: Id<"users">

  name: string
  slug: string
  description: string
  logo?: string
  coverImage?: string

  // Links
  website?: string
  github?: string
  twitter?: string
  demoUrl?: string

  // Metadata
  categories?: string[]
  ecosystems?: string[]
  teamMembers?: string[]                     // names or descriptions for MVP

  // Stats (denormalized)
  applicationCount: number
  grantCount: number
  totalFunded: number

  status: "active" | "archived"

  createdAt: number
  updatedAt: number
}
indexes: by_owner [ownerId], by_slug [slug], by_status [status]
```

### `reviews` (NEW)

Individual review records — supports multi-reviewer workflows.

```
reviews {
  applicationId: Id<"applications">
  reviewerId: Id<"users">
  programId: Id<"programs">

  decision: "approve" | "reject" | "request_changes"
  score?: number                             // 1-5 or 1-10
  feedback: string                           // reviewer comments

  createdAt: number
  updatedAt: number
}
indexes: by_application [applicationId], by_reviewer [reviewerId], by_program [programId]
```

### `activityLogs` (NEW)

An event log for the activity feeds on dashboards and profile pages.

```
activityLogs {
  // Context
  userId: Id<"users">
  organizationId?: Id<"organizations">
  programId?: Id<"programs">
  applicationId?: Id<"applications">
  milestoneId?: Id<"milestones">

  action: string                             // e.g. "application.submitted", "milestone.approved", "program.created"
  description: string                        // human-readable summary
  metadata?: string                          // JSON string for extra context

  createdAt: number
}
indexes: by_user [userId, createdAt], by_org [organizationId, createdAt], by_program [programId, createdAt]
```

### `notifications` (NEW — for future in-app + email)

```
notifications {
  userId: Id<"users">
  
  type: string                               // "application_submitted", "milestone_approved", etc.
  title: string
  message: string
  
  // Reference links
  linkUrl?: string
  
  // Related entities
  programId?: Id<"programs">
  applicationId?: Id<"applications">
  milestoneId?: Id<"milestones">

  read: boolean
  emailSent: boolean

  createdAt: number
}
indexes: by_user [userId], by_user_unread [userId, read]
```

---

## Implementation Phases

The work is organized into **6 phases**, ordered by dependency. Each phase is a self-contained unit of work that results in a testable, demonstrable feature.

---

### Phase 1: Schema & Data Foundation

**Goal:** Deploy the full schema and write core Convex helper functions.

#### Tasks

1. **Create shared auth helpers first** (critical — do this before any feature mutations):
   - `convex/lib/auth.ts` — `requireAuth()`, `requireRole()`, `requireOrgMember()` helpers
   - `convex/lib/slugs.ts` — slug generation & uniqueness checks
2. **Expand `convex/schema.ts`** with all new tables defined above
3. **Create Convex function files** (one per domain):
   - `convex/programs.ts` — CRUD for programs
   - `convex/applications.ts` — CRUD for applications
   - `convex/milestones.ts` — CRUD for milestones
   - `convex/projects.ts` — CRUD for projects
   - `convex/reviews.ts` — create/list reviews
   - `convex/organizationMembers.ts` — invite, list, remove members
   - `convex/activityLogs.ts` — helper to log events
   - `convex/notifications.ts` — create, list, mark-read
4. **Deploy & verify schema** — `npx convex dev` should push without errors

#### Key Design Decisions

- Programs must be associated with an organization (not a user directly)
- Applications link to both a program and a user, with an optional project reference
- Milestones belong to applications (not programs) — each approved application can have its own milestones
- Activity logs are write-heavy but read-light; they support both user-scoped and org-scoped feeds
- The `mechanism` field on programs is a string union, making it easy to add new mechanisms later

#### When This Phase Is Complete

- All tables are deployed to Convex
- Core CRUD functions exist and can be tested via the Convex dashboard or `convex/` REPL
- No UI changes yet

---

### Phase 2: Grant Program Management (Manager Side)

**Goal:** Program Managers can create, configure, and manage grant programs.

#### Tasks

1. **Program Creation Form** (`/dashboard/programs/new`)
   - Multi-step or single-page form
   - Fields: name, description, mechanism, budget, currency, eligibility criteria, timeline, categories
   - Auto-generates slug from name
   - Saves as "draft" by default
   - On submit → redirect to program detail page

2. **Program List Page** (`/dashboard/programs`)
   - Shows all programs for the manager's organization
   - Filters: status (draft/active/paused/closed/completed)
   - Stats per program: application count, approved count, budget remaining
   - Actions: edit, change status, delete (draft only)

3. **Program Detail / Edit Page** (`/dashboard/programs/[id]`)
   - View and edit program settings
   - Status management with transition guards:
     - `draft` → `active` (publish)
     - `active` → `paused` → `active` (toggle)
     - `active`/`paused` → `closed` (stop accepting)
     - `closed` → `completed` (final)
   - Embedded view of applications for this program (summary cards)

4. **Wire up the Manager Dashboard Overview**
   - Replace hardcoded `0` stat values with real Convex queries
   - "Active Programs" stat → count of programs with status "active"
   - "Pending Review" stat → count of applications with status "submitted" or "under_review"
   - "Total Funded" stat → sum of `approvedAmount` across approved applications
   - "Team Members" stat → count of org members

5. **Update Activity Log**
   - Log `program.created`, `program.published`, `program.paused`, `program.closed`

#### When This Phase Is Complete

- A manager can create a grant program, publish it, and see it listed
- Dashboard overview shows real data
- Programs flow through the full status lifecycle

---

### Phase 3: Applications & Review (Builder + Manager)

**Goal:** Builders can apply to programs; Managers can review applications.

#### Tasks

##### Builder Side

1. **Project Creation** (`/dashboard/projects/new` and `/dashboard/projects`)
   - Builders can create named project profiles
   - Fields: name, description, logo, links, categories
   - List view shows all of the builder's projects

2. **Application Form** (accessed via grant explorer or direct link)
   - Route: `/grants/[programSlug]/apply` (public-facing) or modal within dashboard
   - Builder selects a project (or creates one inline)
   - Fields: title, description, requested amount, proposed timeline, team description, relevant links
   - For milestone-based programs: builder adds milestones with titles, descriptions, deliverables, and amounts
   - "Save as draft" and "Submit" actions
   - On submit → status changes to "submitted" + activity log

3. **My Applications List** (`/dashboard/applications`)
   - Builder sees all their applications across programs
   - Filters by status
   - Click through to application detail with status timeline

4. **Application Detail Page** (`/dashboard/applications/[id]`)
   - Full view of the application
   - Shows status history and reviewer feedback
   - For milestone-based: shows milestone list with statuses

##### Manager Side

5. **Application Review Queue** (`/dashboard/applications`)
   - Manager sees applications filtered by their programs
   - Default filter: "submitted" (awaiting review)
   - Batch or individual review mode

6. **Application Review Page** (`/dashboard/applications/[id]`)
   - Full view of builder's application
   - Decision panel: Approve / Reject / Request Changes
   - Score field (optional)
   - Feedback text area
   - Set approved amount (can differ from requested)
   - On approve → creates milestones if milestone-based mechanism
   - Activity log entries: `application.reviewed`, `application.approved`, `application.rejected`

7. **Wire up Builder Dashboard Overview**
   - "Applications" stat → count of builder's applications
   - "Active Grants" stat → count of approved applications
   - "Milestones Due" stat → count of milestones pending this month
   - "Total Earned" stat → sum of approved amounts from completed milestones

#### When This Phase Is Complete

- Full application lifecycle: draft → submit → review → approve/reject
- Both builder and manager dashboards show real data
- Activity feeds reflect actual application events

---

### Phase 4: Milestone Tracking

**Goal:** Builders submit deliverables; Managers verify and release milestones.

#### Tasks

1. **Milestone List Page** (`/dashboard/milestones`)
   - **Builder view:** shows all milestones across approved applications
   - **Manager view:** shows milestones pending review for their programs
   - Filters: status, program, due date
   - Visual: progress bar per application showing milestone completion

2. **Milestone Detail / Submission** (`/dashboard/milestones/[id]`)
   - Builder can submit deliverables: notes + links
   - Status changes: `pending` → `in_progress` → `submitted`
   - After submission → visible to manager

3. **Milestone Review** (manager side)
   - Manager reviews submission
   - Actions: Approve, Reject, Request Revision
   - Review notes
   - On approve → milestones.approved, amount recorded
   - On reject → milestones.rejected with notes
   - On revision → milestones.revision_requested with notes

4. **Activity Logging**
   - `milestone.submitted`, `milestone.approved`, `milestone.rejected`, `milestone.revision_requested`

#### When This Phase Is Complete

- Full milestone lifecycle: pending → in-progress → submitted → reviewed
- Builders can track their deliverables
- Managers can verify and approve milestones
- Dashboard stats update in real-time

---

### Phase 5: Public Discovery (Grants Explorer + Projects Explorer)

**Goal:** Public pages where anyone can browse programs and projects.

#### Tasks

1. **Grants Explorer** (`/grants`)
   - Lists all programs with status "active" (optionally also "closed" and "completed" for history)
   - Filter/search: by category, ecosystem, mechanism type, status
   - Cards show: program name, org name, budget, deadline, application count
   - Click through → program detail page

2. **Grant Program Detail** (`/grants/[slug]`)
   - Public page showing full program info
   - Eligibility criteria
   - Application requirements
   - Timeline visualization
   - "Apply Now" CTA (redirects to sign-in if not authenticated)
   - Shows funded projects (if any)

3. **Projects Explorer** (`/projects`)
   - Lists all projects with status "active"
   - Filter/search: by category, ecosystem
   - Cards show: project name, builder name, funding history, categories

4. **Project Detail** (`/projects/[slug]`)
   - Public page showing project info
   - Funding history (which grants they've received)
   - Milestone completion record
   - Team info
   - Links to repos, demos, etc.

5. **Builder Profile** (`/builders/[username]`)
   - Public profile showing a builder's projects, applications, and reputation
   - Displays: bio, skills, social links, project list, funding history, milestone stats

6. **Organization Profile** (`/orgs/[slug]`)
   - Public profile showing an organization's programs and funded projects
   - Displays: org description, active/past programs, total funded, team members

#### When This Phase Is Complete

- Anyone can browse active grant programs without signing in
- Anyone can explore funded projects
- Builders can discover and apply to programs from the public explorer

---

### Phase 6: Team Management & Analytics

**Goal:** Multi-reviewer support and basic analytics.

#### Tasks

1. **Team Management Page** (`/dashboard/team`)
   - List current org members with roles (owner/admin/reviewer)
   - Invite new members by email or username
   - Change member roles
   - Remove members
   - For MVP, invitation can be a simple "add by username" flow

2. **Authorization Enforcement**
   - Only org members with appropriate roles can:
     - Create programs (admin+)
     - Review applications (reviewer+)
     - Manage team (admin+)
     - Delete programs (owner only)
   - Add checks in Convex mutations

3. **Analytics Dashboard** (`/dashboard/analytics`)
   - **For managers:**
     - Applications over time (per program)
     - Approval rate
     - Total funds distributed
     - Most active programs
   - **For builders (future):**
     - Application success rate
     - Milestones completed
   - For MVP, these can be simple stat cards with counts from Convex queries rather than charts

#### When This Phase Is Complete

- Organizations can have multiple team members with different roles
- Basic analytics provide insight into program performance
- Role-based permissions are enforced across the platform

---

## Cross-Cutting Concerns

These items should be addressed progressively across all phases:

### Error Handling & Validation

- All Convex mutations should validate inputs and return clear error messages
- Client-side forms should validate before submission
- Handle edge cases: duplicate slugs, concurrent edits, deleted references

### Loading & Empty States

- Every list page needs: loading skeleton, empty state with CTA, error state
- Already established pattern with existing `EmptyState` component

### Activity Logging

- Every significant mutation should log to `activityLogs` table
- Pattern: call `logActivity()` helper at the end of each mutation
- Activity feed on dashboards reads from `activityLogs` with user/org filter

### Notifications (stretch goal)

- In-app: write to `notifications` table alongside activity logs
- Email (Resend): Convex action that calls Resend API — best woven into Phase 3 alongside application status changes (highest-value trigger point: application approved/rejected, new application received)
- Priority notifications: application approved, milestone reviewed, new application received
- Could be implemented as a Phase 7 or woven into Phase 3-4 as you go

### Responsive Design

- Dashboard sidebar should collapse on mobile (hamburger menu)
- Public pages should be fully responsive
- Forms should work well on tablet+

---

## File Structure (Projected)

```
convex/
  schema.ts                     # expanded with all tables
  users.ts                      # existing — no changes
  programs.ts                   # NEW
  applications.ts               # NEW
  milestones.ts                 # NEW
  projects.ts                   # NEW
  reviews.ts                    # NEW
  organizationMembers.ts        # NEW
  activityLogs.ts               # NEW
  notifications.ts              # NEW (stretch)
  lib/
    auth.ts                     # auth helpers
    slugs.ts                    # slug utilities

app/
  dashboard/
    page.tsx                    # updated to use real queries
    layout.tsx                  # existing — minimal changes
    programs/
      page.tsx                  # program list
      new/
        page.tsx                # create program form
      [id]/
        page.tsx                # program detail / edit
    applications/
      page.tsx                  # application list (role-aware)
      [id]/
        page.tsx                # application detail / review
    milestones/
      page.tsx                  # milestone list (role-aware)
      [id]/
        page.tsx                # milestone detail / submit / review
    projects/
      page.tsx                  # builder's project list
      new/
        page.tsx                # create project form
      [id]/
        page.tsx                # project detail / edit
    analytics/
      page.tsx                  # analytics dashboard
    team/
      page.tsx                  # team management

  grants/                       # PUBLIC
    page.tsx                    # grants explorer
    [slug]/
      page.tsx                  # program detail (public)
      apply/
        page.tsx                # application form

  projects/                     # PUBLIC
    page.tsx                    # projects explorer
    [slug]/
      page.tsx                  # project detail (public)

  builders/                     # PUBLIC
    [username]/
      page.tsx                  # builder profile (public)

  orgs/                         # PUBLIC
    [slug]/
      page.tsx                  # organization profile (public)

components/
  # new shared components as needed:
  # status-badge.tsx, timeline.tsx, stat-card.tsx, data-table.tsx, etc.
```

---

## Suggested Build Order for New Chat Sessions

When starting a new chat session, reference this document and `project-idea.md`, then specify which phase and task to work on. Example prompts:

> **Session 1:** "Working on Phase 1 — expand the Convex schema with all the tables from the implementation plan, then create the programs.ts Convex functions with full CRUD."

> **Session 2:** "Working on Phase 2 — build the program creation form at `/dashboard/programs/new` and the program list page at `/dashboard/programs`."

> **Session 3:** "Working on Phase 3 — build the application form and builder's application list."

This approach keeps each session focused and avoids context overload.

---

## Summary

| Phase | Core Deliverable | Depends On |
|---|---|---|
| **Phase 1** | Schema + Convex functions | — |
| **Phase 2** | Program management (manager) | Phase 1 |
| **Phase 3** | Applications + review (builder + manager) | Phase 1, 2 |
| **Phase 4** | Milestone tracking | Phase 3 |
| **Phase 5** | Public explorers | Phase 1, 2, 3 |
| **Phase 6** | Team management + analytics | Phase 1, 2 |

Phases 2, 3, 5, and 6 can overlap in practice once Phase 1 is done, but the dependency arrows above show the logical prerequisites.
