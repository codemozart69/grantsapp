# GrantsApp — Next Session Handoff

## What GrantsApp Is

A full-lifecycle grant management platform. Two roles:
- **Builder** — creates projects, applies to grant programs, tracks milestones, builds funding reputation
- **Program Manager** — creates and operates grant programs via an Organization, reviews applications, approves milestones

Tech stack: Next.js 16 (App Router), Convex (backend + realtime DB), Clerk v7 (auth), Tailwind CSS, shadcn/base-ui components, Tabler icons.

---

## Current State — What's Already Built

### Backend (Convex — all complete)
- `convex/schema.ts` — full schema: users, organizations, organizationMembers, programs, applications, milestones, projects, reviews, activityLogs, notifications
- `convex/users.ts` — auth, onboarding, role switching
- `convex/programs.ts` — full CRUD, status transitions, org stats
- `convex/applications.ts` — full lifecycle (create, submit, review, withdraw), listMine, listByOrg, listByProgram
- `convex/milestones.ts` — full lifecycle (create, start, submit, review)
- `convex/projects.ts` — full CRUD, listPublic, getBySlug, builder stats
- `convex/organizations.ts` — getMyOrg, getById, getBySlug
- `convex/organizationMembers.ts` — invite, role change, remove, listMembers
- `convex/activityLogs.ts` — getUserActivity, getOrgActivity
- `convex/notifications.ts` — createNotification, getMyNotifications, getUnreadCount, markRead, markAllRead
- `convex/reviews.ts` — create, update, listByApplication
- `convex/profiles.ts` — getBuilderByUsername (public profile query)

### Frontend (all pages complete)
- Auth: Clerk sign-in/sign-up, `/onboarding` (role selection → profile → org setup)
- Dashboard layout with role-aware sidebar and role-switching popover
- `/dashboard` — overview for both builder and manager with real data
- `/dashboard/programs` — list, create (`/new`), edit/manage (`/[id]`)
- `/dashboard/applications` — role-aware list + detail/review (`/[id]`)
- `/dashboard/milestones` — role-aware list + detail/submit/review (`/[id]`)
- `/dashboard/projects` — list, create (`/new`), edit/archive (`/[id]`)
- `/dashboard/team` — invite, role change, remove members
- `/dashboard/analytics` — funnel, program breakdown table, quick stats
- `/grants` — public grants explorer with filters
- `/grants/[slug]` — program detail with apply CTA
- `/grants/[slug]/apply` — full application form with milestone editor
- `/projects` — public projects explorer with filters
- `/projects/[slug]` — project detail page
- `/builders/[username]` — public builder profile
- `/orgs/[slug]` — public org profile

### Known gap in API types
`convex/profiles.ts` is a new file added last session. After copying it into the repo, run `npx convex dev` to regenerate `_generated/api.d.ts` before the builder profile page will typecheck cleanly.

---

## What Needs to Be Built — Prioritised Work List

### 1. Landing page — `app/page.tsx`
Currently renders a raw `ComponentExample` component. Needs a proper marketing/landing page:
- Hero section with value prop ("Launch and manage grant programs. Apply for funding.")
- Feature highlights for both roles (manager + builder)
- Links to Browse Grants, Sign Up, Sign In
- Possibly a stats strip (total programs, total funded, etc. — can be static for now)

### 2. `/orgs` and `/builders` listing pages + navigation links

**New Convex queries needed (add to existing files or new `convex/discover.ts`):**
```ts
// List all organizations publicly (paginated or limited)
export const listOrgs = query(...)

// List all builders publicly (users with builder role)
export const listBuilders = query(...)
```

**New pages:**
- `app/orgs/page.tsx` — grid of org cards (logo, name, description, program count, total funded), links to `/orgs/[slug]`
- `app/builders/page.tsx` — grid of builder cards (avatar, name, username, skills, grant count), links to `/builders/[username]`

**Navigation changes:**
- Site header (`components/site-header.tsx`) — add "Orgs" and "Builders" nav links alongside "Browse Grants" and "Projects"
- Dashboard sidebar (`components/dashboard/sidebar.tsx`) — add "Orgs" and "Builders" to the `exploreNav` array

### 3. Surface profile links throughout the UI

Small changes, high discoverability impact:
- `/grants` cards — org name should link to `/orgs/[slug]`
- `/grants/[slug]` — org name/logo should link to `/orgs/[slug]`
- `/dashboard/applications` rows — `@username` on manager view should link to `/builders/[username]`
- `/dashboard/applications/[id]` — applicant username should link to `/builders/[username]`
- `/projects` cards — `@username` should link to `/builders/[username]`
- `/projects/[slug]` — owner username/name should link to `/builders/[username]`

### 4. Fix builder dashboard Recent Applications panel

In `app/dashboard/page.tsx`, the `BuilderOverview` component has:
```tsx
// Currently:
<div className="py-4 text-center text-xs text-muted-foreground">
  Full application list coming soon.{" "}
  <Link href="/dashboard/applications">View in Applications →</Link>
</div>
```
Replace with real data — pull the last 3-4 applications using the existing `applications.listMine` query and render them as compact rows.

### 5. Program filter / context selector — three pages affected

**Analytics page (`app/dashboard/analytics/page.tsx`)**
- Add a program selector dropdown at the top ("All programs" default)
- When a specific program is selected, swap the funnel and activity feed into single-program mode
- Top stat cards remain org-level aggregates regardless of selection

**Manager applications page (`app/dashboard/applications/page.tsx`)**
- The URL already supports `?program=` but it's never surfaced in the UI
- Add a program filter dropdown alongside the existing status filter tabs
- Populated from the manager's list of programs

**Builder milestones page (`app/dashboard/milestones/page.tsx`)**
- Don't use a dropdown filter here — group milestones by application/grant instead
- Each approved grant becomes a collapsible section header: "[Application title] · Program Name · $Amount"
- Milestones listed under their grant, with per-grant progress shown
- This is more readable than a flat list when a builder has multiple active grants

### 6. In-app notifications

The entire backend already exists in `convex/notifications.ts`. Need:

**Sidebar bell icon** — add to `components/dashboard/sidebar.tsx`:
- Bell icon in the sidebar footer or header area
- Unread count badge using `api.notifications.getUnreadCount`
- Click opens a dropdown/panel

**Notification dropdown panel** — new component `components/dashboard/notifications-panel.tsx`:
- List of recent notifications from `api.notifications.getMyNotifications`
- Each item: icon based on type, title, message, timestamp, read/unread state
- Mark as read on click (`api.notifications.markRead`)
- "Mark all read" button
- Notification types to handle: `application_submitted`, `application_approved`, `application_rejected`, `milestone_submitted`, `milestone_approved`, `milestone_rejected`, `milestone_revision_requested`

### 7. Inline project creation during application form

Current state: `app/grants/[slug]/apply/page.tsx` shows a project selector dropdown if the builder has existing projects, and nothing if they have none.

Needed behaviour — three cases:
1. **No projects** → show inline project mini-form as default (name + description fields, expandable to full form)
2. **Has projects, applying for existing one** → current selector, works fine
3. **Has projects, wants to create a new one** → add "＋ Create new project" option at the bottom of the select dropdown; selecting it reveals the inline mini-form; on save, new project is created and auto-selected in the dropdown

The inline project creation should call the existing `projects.create` mutation. A minimal version needs just name + description (required) with the rest being optional and editable later.

### 8. Mobile sidebar collapse

`components/dashboard/sidebar.tsx` is a fixed 216px wide sidebar with no mobile behaviour. Needs:
- A hamburger/menu button visible on small screens
- Sidebar slides in as a drawer overlay on mobile
- Overlay backdrop closes it
- Current desktop layout unchanged

---

## Important Notes for Implementation

**Convex query pattern** — the codebase uses `(api as any).module.function` casting throughout to avoid type errors from the generated API. Follow this same pattern consistently.

**Auth pattern** — all authenticated queries use:
```tsx
const { isAuthenticated } = useConvexAuth();
const data = useQuery(someQuery, !isAuthenticated ? "skip" : { ...args });
```

**Role checks** — `currentUser.activeRole === "manager"` or `=== "builder"` for role-aware rendering. Never trust client-side alone; Convex mutations use `requireAuth` and `requireOrgMember` helpers server-side.

**Component patterns to follow:**
- Status badges: see `components/dashboard/applications/application-status-badge.tsx`
- Empty states: `components/dashboard/empty-state.tsx` — always use this, never roll custom
- Skeletons: always show loading skeletons before data arrives
- Two-step confirmations for destructive actions (same pattern as program delete and project archive)

**File structure conventions:**
- Dashboard pages: `app/dashboard/[section]/page.tsx`
- Public pages: `app/[section]/page.tsx` or `app/[section]/[param]/page.tsx`
- Shared dashboard components: `components/dashboard/`
- Convex functions: `convex/[domain].ts`

**UI library:** shadcn base-ui components from `components/ui/`. Always use `Button`, `Input`, `Textarea`, `Field/FieldLabel/FieldDescription`, `Skeleton` from there. Tabler icons (`@tabler/icons-react`) for all icons.

---

## Suggested Build Order for New Session

1. Start with items 1-3 together (landing page, listing pages, nav links, profile link surfacing) — these are all about discoverability and making the app feel navigable
2. Item 4 (dashboard Recent Applications fix) — quick win
3. Item 7 (inline project creation in apply form) — improves a key flow
4. Item 5 (program filter / milestone grouping) — improves power-user experience
5. Item 6 (notifications) — completes the feedback loop
6. Item 8 (mobile sidebar) — polish

---

## Data Model Quick Reference

```
users          → roles[], activeRole, builder fields (bio, skills, github, etc.)
organizations  → managerId → users._id, name, slug, description
programs       → organizationId, mechanism (direct|milestone), status, applicationCount, approvedCount, totalAllocated
applications   → programId, applicantId, projectId?, status, approvedAmount, reviewedBy
milestones     → applicationId, programId, applicantId, order, status, amount, submissionLinks[]
projects       → ownerId, slug, applicationCount, grantCount, totalFunded, status (active|archived)
notifications  → userId, type, title, message, read, programId?, applicationId?, milestoneId?
activityLogs   → userId, organizationId?, programId?, applicationId?, action, description
```