---
sidebar_position: 0
title: Sponsor Dashboard
description: Sponsor guide to Dashboard.
---

## Overview

The sponsor dashboard gives you access to comprehensive key metrics at a glance for your selected sponsor account. You can get an instant overview of the total funds rewarded, the number of active listings you're running, and the total submissions received, helping you track your impact and activity.

## Manage Multiple Sponsor Identities

If you oversee several initiatives or entities (e.g., different DAOs, project arms, or grant programs), you can manage all their distinct sponsor profiles from a single NEARN user account, switching seamlessly between them.

:::tip
On the dashboard you can switch between multiple sponsors by selecting the desired Sponsor from the dropdown box.
:::

## Manage Active Listings

You can view and manage all your opportunities in one organized space:

<div class="screenshot">
<img alt="Publish" src="/img/sponsor/dashboard.png" />
</div>

### Listing Metrics

- **Rewarded:** Total compensation (in USD) of listings where the winners have been announced.
- **Listings:** Total number of listings added to NEARN.
- **Submissions:** Total number of submissions/applications received on all listings.

### Filter and Search

You can easily filter your listings by their type ([Bounties, Projects, Sponsorships](../opportunities.md)) or current status to quickly find what you need.

### Quick Actions & Edits

The listings table offers a clear summary of each opportunity (_name, submission count, deadline, prize, status_) and provides direct links to edit listings or view their respective submissions, streamlining your management process.

### Listing Lifecycles

Listings progress through distinct stages, clearly indicated on your dashboard via their current status:
- **Draft:** The listing has been created but is not yet published.
- **In Progress:** The listing is published and actively accepting submissions.
- **In Review:** The submission deadline has passed, and the sponsor is now reviewing the submissions.
- **Payment Pending:** The sponsor has selected the recipient(s), but payment or verification is still pending.
- **Completed:** The sponsor has processed and verified payment to the recipient(s).
- **Deleted:** The listing has been hidden from the platform (typically an admin action or for listings that are no longer relevant and were never activated/completed).

---

## Submissions

All submissions and applications for your opportunities are collected in a dedicated **`Submissions`** page. This allows for consistent and organized review across all your listings for a specific sponsor identity.

:::tip
You can also view submissions within a listing, by selecting any of your listings from the [My Listing section](#manage-active-listings).
:::

<div class="screenshot">
<img alt="Publish" src="/img/sponsor/submissions.png" />
</div>

### Advanced Review Tools

You can filter submissions or view their individual status as they move through your review pipeline.

- **Search:** Use the search function to find specific contributors or applications.
- **View Submission:** Dive deep into each submission to view comprehensive contributor details, including their NEARN profile, contact information (email), NEAR wallet address, and KYC/KYB verification status. Also view their submitted materials and answers to your custom questions, ensuring you have all the information needed for evaluation.

### Submission Lifecycle

- **New:** A fresh submission requiring sponsor action; can be edited by the submitter.
- **Reviewed:** The submission has been looked at by the sponsor; it is now locked and cannot be edited by the submitter. Sponsor action is still required.
- **Shortlisted:** The submission has been marked as a potential candidate; it is locked and cannot be edited. Sponsor action is still required.
- **Approved:** The submission has been selected as a winner or approved for the opportunity.
- **Rejected:** The submission has not been selected.
- **Paid:** Payment has been processed for the approved submission/participant. (This status is typically updated automatically or by the sponsor after payment actions).
- **Spam:** The submission has been marked as spam, and the submitter may be blocked from making new submissions to that listing.
- **Deleted:** The submission has been removed (typically an admin/sponsor action).

### Collaborate on Selections

You can access the internal notes section attached to each submission for your team’s private discussions, feedback, and deliberations during the review process.
A dedicated public comments section allows for more threaded discussion if needed, keeping all communication about a submission in one place.

### Advanced Selection Tools

**Flexible approval** depending on the listing type:
- For [Bounties](../opportunities.md#bounties), select multiple winners and assign specific places (e.g., 1st, 2nd, bonus) according to your prize structure.
- For [Projects](../opportunities.md#projects), select the single best applicant/proposal to award the project to.
- For [Sponsorships](../opportunities.md#sponsorships), approve multiple individuals or teams who meet the criteria to receive support.

:::info Automated public announcements
- For Bounties and Projects, selected winners are automatically announced on the listing page, providing transparency and recognition.
- For Sponsorships, approved recipients are managed and funded as per the program's design.
:::

### Manage Payments

The system facilitates payment processing, by keeping track of the payment status, agreed amount, and specified currency (e.g., USDT) for each approved submission.. For instance, once a sponsor adds a payment link or confirms payment through integrated methods, the corresponding submission's status will typically be updated to **PAID**, and the overall listing will move to **Payment Pending** or **Completed** based on whether all payments are done.

:::tip
It's recommended to formally conclude your engagements by marking opportunities as **`Completed`** within the platform.
:::

## Export Records

Export submission data to CSV at any time, either for all submissions under a sponsor or for a specific listing. This is useful for offline analysis, reporting, or archival purposes.

### Export all Submissions

To export all submissions under your Sponsor:
1. Open the **`Submissions`** section.
2. _(Optional)_ Select the desired filters:
   - **Type:** select the listing type (`All`, `Bounties`, `Projects`, `Sponsorships`).
   - **Status:** select the submission status (`Everything`, `New`, `Reviewed`, `Rejected`, etc.).
3. Click on **`Export CSV`**.

<div class="screenshot">
<img alt="Export" src="/img/sponsor/export-subm-list.png" />
</div>

### Export Submissions for a Listing

To export all submissions for a specific listing:
1. Open the **`My Listings`** section.
2. Select the desired listing.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshot">
<img alt="Export" src="/img/sponsor/export-list-view.png" />
</div>

---

## Team Settings

In the **`Team Settings`** section you can view all team members, their roles, and manage pending invites.

You can add colleagues to collaborate on managing your sponsor profile(s), and assign roles like **`Admin`** (full control, including team management) or **`Member`** (manage listings, submissions, payments) to ensure efficient teamwork and secure access.

<div class="screenshot">
<img alt="Publish" src="/img/sponsor/team-manage.png" />
</div>

### Add Members

To add a new member to your Sponsor team:
1. Open the **`Team Settings`** section.
2. Click on the **`Invite Members`** button.
3. Enter the email address to invite.
4. Select the member type:
   - **Member:** can manage listings, submissions, winner announcements and payments.
   - **Admin:** can add or remove anyone from the team, in addition to having all Member privileges.
5. Click on **`Send Invite`**.

<div class="screenshot">
<img alt="Publish" src="/img/sponsor/invite.png" width="50%" />
</div>

:::tip
You can also review the pending invitations if you switch to the **`Pending Invites`** tab.
:::

### Remove Members

If you have administrator rights, you can remove members from the Sponsor team:

1. Open the **`Team Settings`** section.
2. Search for the user under the **`Team Members`** tab.
3. Click on the **`Remove`** button next to the user.
4. A confirmation dialog will open.
5. Click on **`Remove Member`**.

---

## Sponsor-Specific Alerts

You can [opt-in to receive email notifications](profile.md#update-your-email-preferences) critical to managing your opportunities effectively:
- Alerts for new submissions received for your listings.
- Notifications for comments made on your listings.
- Deadline-related reminders to help you stay on track.
