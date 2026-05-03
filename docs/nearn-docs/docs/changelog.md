---
sidebar_position: 20
sidebar_label: "Changelog"
title: Latest Changes
description: Latest changes and updates on NEARN.
---

## Roadmap

The NEARN team is working hard every day, simplifying the user experience for sponsors and contributors.
We're excited to share [our roadmap](https://github.com/NEAR-DevHub/.github/issues/29) and offer you a glimpse of our upcoming new features!

:::info
To learn more about upcoming features and improvements, check out the [NEARN roadmap](https://github.com/NEAR-DevHub/.github/issues/29).
:::

---

## Changelog

This section tracks the evolution of NEARN: find out what's new, what's fixed, or just take a trip down memory lane, remembering those bugs of yesterday.

## November 2025

**What’s New ✨**

- Added complete support for new React version of [Near Treasury](https://app.neartreasury.com).

<!--
**Bug Fixes 🐛**
-->

## October 2025

**What’s New ✨**

- Added cron job for overdue Milestones.
- Added Milestones support for projects and sponsorships.
- Re-designed tabs for notes, comments, and activity.
- Combined `approved`/`paid`/`submission date` into a Dates table column.
- Extended Sponsor submission viewing area.
- Improved modal for hiring talent:
  - After a Sponsor selects a winner for a project, all other talents will be rejected.
- Introduced new submission statuses (`Canceled`, `In-Progress`) for projects and sponsorships.
- Introduced new listing status (`Canceled`) for projects.
- Improved default submission order for listing in Sponsor view.
- Added currency conversion for manual payment.
- Added animation to tab change in Sponsor edit mode.
- Added notification solution to the NEARN platform.
  - New in-app notifications.
  - New email design for notifications.

**Bug Fixes 🐛**

- Fixed: a user could have a 0th place during bounty editing, preventing you from publishing.
- Fixed: users couldn't log out in some scenarios.
- Fixed: preview recursion when a user go to edit from preview page.
- Fixed: issue where the user couldn't log out of listing editing.
- Fixed: on Firefox, allow users to choose a Google account instead of using the last one.
- Fixed: NEARN used the wrong Coingecko price API ticker for AURORA token.
- Fixed: skills could go behind the footer in Talent edit mode.
- Fixed: payment type for project/bounty/sponsorships.

---

## September 2025

**What’s New ✨**

- Added searching and sorting options to Sponsor dashboard:
  - Sort by approval date.
  - Sort by payment date.
  - Search by message field in the activity history.
- Added Sponsor configuration option for multiple submissions (Submission Limit Settings).
- Renamed the `Author` role to `Talent` in the comments and activity.
- Added a `Creator` role to comments made by the listing's creator.
- Added support to pin comments:
  - Sponsors can pin comments in listings and submissions.
  - Talents can pin comments in their Proof of Work.
- Added fiat currencies to _Manual Payment_.
- Added an optional activity field to the submission table to review the latest activity.
- Changed internal notes to comments.
- Added JAMBO token support.

**Bug Fixes 🐛**

- Fixed: Activity displayed unfinished lines and empty dates in some cases.
- Fixed: User-facing submission table displayed incorrect submission time.
- Fixed: Users/Sponsors could create empty comments.
- Fixed: Bounty could not be edited after the deadline.
- Fixed: Bounties and projects could be edited in the non-`New` status.
- Fixed: Sponsorship with fixed currency was not able to approve winners.

---

## August 2025

**What’s New ✨**

- [CSV Export](sponsor/dashboard.md#export-records): Standardized and improved export process for individual listings and all submissions.
- Re-designed `Create a Listing` modal to improve clarity between listing types.
- Added the ability to have a link to specific comments.
- Removed the $100 USD limit to pop up on the main page.
- Ability to create a Manual Payment.
- Automate NEAR Treasury status sync.
- Update submission status & payment info as soon as payment is entered.
- Improve Submission Details. (Payment Amount)
- Auto-save contributor submissions.
- Added Payment Request feature.

**Bug Fixes 🐛**

- Fixed bug where the time tooltip was rendered behind the activity modal.
- Fixed bug where the feed submission link worked as relative rather than external in some cases.
- Fixed USD value calculations for sponsorships with the chosen token.
- Fixed an issue with the reward index after a Platform Admin reverted a submission from the `Approved` state.
- Fixed bug where listing status shows as `Payment Pending` when it's completed.
- Fixed bug where `Back` button does not work if page is opened in a new tab.
- Fixed non-intuitive behavior on the Sponsor Dashboard. (`Submissions`)

---

## July 2025

We’ve been listening closely, and the NEARN team has already closed [47 issues](https://github.com/NEAR-DevHub/nearn/issues?q=is%3Aissue%20state%3Aclosed%20closed%3A%3E2025-06-10), from bug fixes to new features.

**What’s New ✨**
  
- 🧑‍💼 [Sponsor Profiles](sponsor/profile.md): Now you can add a banner, write an about section, and customize your public profile – so contributors can learn about your team or project.

- 🤝 [Treasury Integration](sponsor/treasury.md): Sponsors can now link their NEARN account to NEAR Treasury, making it easy to manage the entire reward flow – from approved submission to on-chain payment.

- 📝 [Improved Listing Flow](sponsor/listing-guide.md): We’ve redesigned the experience to make it faster and more intuitive – with a new preview mode, clearer form sections for sponsors and contributors, and support for dropdown-style custom questions in your application forms.

Try out these new features and let us know what you think – more improvements are on the way! 🚀

---
