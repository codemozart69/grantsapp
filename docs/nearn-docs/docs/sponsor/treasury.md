---
sidebar_position: 4
title: Treasury Integration
description: NEAR Treasury integration guide.
---

## Overview

The [NEAR Treasury](https://neartreasury.com) integration allows sponsors to create payment proposals directly from NEARN once a submission has been approved.

While payments are still approved and executed on NEAR Treasury, this integration streamlines the entire sponsor flow: from listing an opportunity to reviewing submissions, approving rewards, and generating a Treasury proposal. Once a payment is confirmed on-chain, NEARN will automatically reflect its status.

## Requisites

Before you can connect your Sponsor account with a [NEAR Treasury](https://neartreasury.com) instance, you need to add the special account `nearn-io.near` to your [Treasury Member List](https://docs.neartreasury.com/settings#adding-members). This allows NEARN to create payment requests when a winner is selected and payments need to be processed.

To add `nearn-io.near` to your Treasury:

1.  Open your [NEAR Treasury site](https://treasury-factory.near.page/).
2.  Navigate to the **`Settings`** page.
3.  Select the **`Members`** tab.
4.  Click the **`+ Add Member`** button.
5.  Enter the NEAR wallet address `nearn-io.near`.
6.  Choose the member's role **`Requestor`**.
7.  Click the **`Save`** button and confirm the transactions.
8.  Go to the **`Requests`** page to [approve the request](https://docs.neartreasury.com/settings#pending-requests).

<div class="screenshot">
<img alt="Add nearn-io.near" src="/img/sponsor/add-nearn-io.png" width="50%" />
</div>


## Connect to NEAR Treasury

Follow these simple steps to connect your Sponsor profile to a NEAR Treasury instance:

### 1. Sign in

- Go to [https://nearn.io](https://nearn.io).
- Click **`Sign In`** (top right) and connect via:
  - **Google** account
  - **E-mail** address

### 2. Connect your Treasury

1. Once logged in, open the [**`Sponsor Dashboard`**](https://nearn.io/dashboard/listings/).
2. On the dashboard, select the desired Sponsor from the dropdown box. (top-left corner).
3. Click on the pencil icon to open the **`Edit Sponsor Profile`** screen.

<div class="screenshot">
<img alt="Screenshot of the Edit Sponsor Profile form with pencil icon" src="/img/sponsor/edit-pencil.png" width="60%" />
</div>

4. Select the **`Integrations`** tab and set your NEAR Treasury information.
   - **NEAR Treasury URL:** Please be sure to [add `nearn-io.near` to your Treasury member list](#requisites) before setting up the integration.
5. Click **`Connect`** to complete the integration.

<div class="screenshot">
<img alt="Connect treasury" src="/img/sponsor/treasury-connect.png" width="80%" />
</div>

<div class="screenshot">
<img alt="Connect treasury" src="/img/sponsor/connected-treasury.png" width="80%" />
</div>

---

## Make a Payment with NEAR Treasury

Follow [these steps](payments.md#make-a-payment-with-near-treasury) to process a payment using your connected NEAR Treasury.
