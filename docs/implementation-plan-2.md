# Implementation Plan 2 — Payment Foundation, Communication Layer & FVM Integration

> **Context:** MVP is complete (6 phases done). Handoff items (landing page, listing pages, notifications, mobile sidebar, inline project creation) are all done. This plan covers the remaining work to make GrantsApp a fully functional Web3 grant platform.

## Project Configuration Notes

- **Hardhat version:** 3.2.0+
- **Init template:** `node-test-runner-viem`
- **Solidity version:** 0.8.28
- **Testing approach:** Solidity tests (using forge-std v1.9.4 for assertions)
- **Smart contract folder:** `smart-contracts/`
- **Target chain:** Filecoin Calibration testnet (chain ID: 314159)
- **Supported tokens:** FIL (native) + tUSDC (ERC-20 on Filecoin testnet)
- **Wallet connection:** RainbowKit
- **Contract test files:** `contracts/*.t.sol` pattern (Hardhat 3 convention)

---

## Phase 1: Payment Tracking Foundation

**Goal:** Add payment state tracking to the data model so "approved" and "paid" are separate states (inspired by Nearn's "Complete Payment" workflow). This is a prerequisite for FVM integration — once contracts are live, these fields will be populated from on-chain data.

### 1A. Schema Changes

#### [MODIFY] [schema.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/schema.ts)

Add payment tracking fields to `applications` and `milestones` tables:

**`applications` table — add:**
```typescript
// Payment tracking
paymentStatus: v.optional(v.union(
  v.literal("unpaid"),
  v.literal("payment_pending"),
  v.literal("paid")
)),
paymentAmount: v.optional(v.number()),
paymentCurrency: v.optional(v.string()),    // "FIL" | "USDC"
paymentTxHash: v.optional(v.string()),       // on-chain transaction hash
paymentMethod: v.optional(v.union(
  v.literal("fvm_contract"),                  // via smart contract
  v.literal("manual"),                        // recorded manually
  v.literal("external_link")                  // pasted tx link
)),
paidAt: v.optional(v.number()),
paidBy: v.optional(v.id("users")),
```

**`milestones` table — add:**
```typescript
// Payment tracking
paymentStatus: v.optional(v.union(
  v.literal("unpaid"),
  v.literal("payment_pending"),
  v.literal("paid")
)),
paymentAmount: v.optional(v.number()),
paymentCurrency: v.optional(v.string()),
paymentTxHash: v.optional(v.string()),
paymentMethod: v.optional(v.union(
  v.literal("fvm_contract"),
  v.literal("manual"),
  v.literal("external_link")
)),
paidAt: v.optional(v.number()),
paidBy: v.optional(v.id("users")),
```

Add a new `comments` table:
```typescript
comments: defineTable({
  // Polymorphic — can be on applications or milestones
  targetType: v.union(v.literal("application"), v.literal("milestone")),
  targetId: v.string(),  // application ID or milestone ID

  authorId: v.id("users"),
  content: v.string(),

  isInternal: v.boolean(),  // true = visible only to org members (private notes)

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_target", ["targetType", "targetId"])
  .index("by_author", ["authorId"]),
```

### 1B. Backend Functions — Payment Mutations

#### [MODIFY] [applications.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/applications.ts)

- **Modify `review` mutation**: when approving, set `paymentStatus: "unpaid"`
- **Add `recordPayment` mutation**: manager records payment (manual, external link, or FVM tx hash)
  - Args: `applicationId`, `paymentMethod`, `paymentAmount`, `paymentCurrency`, `paymentTxHash`
  - Sets `paymentStatus: "paid"`, `paidAt: Date.now()`, `paidBy: user._id`
  - Creates notification for builder: "Your grant payment has been processed"
  - Logs activity

#### [MODIFY] [milestones.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/milestones.ts)

- **Modify `review` mutation**: when approving, set `paymentStatus: "unpaid"`
- **Add `recordPayment` mutation**: same pattern as applications

### 1C. Backend Functions — Comments

#### [NEW] [comments.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/comments.ts)

- `listByTarget(targetType, targetId)` — list comments for an application or milestone
- `create(targetType, targetId, content, isInternal)` — post a comment
- `update(commentId, content)` — edit own comment
- `remove(commentId)` — delete own comment or org member can delete
- Access control: public comments visible to all, internal comments only to org members

### 1D. Frontend — Status Banners & Payment UI

#### [MODIFY] Application Detail Page — `app/dashboard/applications/[id]/page.tsx`
- Add status explanation banner:
  - "submitted" → "Your application has been submitted and is awaiting review"
  - "under_review" → "A reviewer is currently evaluating your application"
  - "approved" + unpaid → "Your application has been approved! Payment is pending"
  - "approved" + paid → "Approved and paid ✓" + tx hash link
  - "rejected" → "This application was not approved"
- Add inline builder profile card (for manager view)
- Add wallet address display
- Add "Complete Payment" dropdown for managers (when approved + unpaid):
  - "Record Manual Payment" — form with amount, currency, tx reference
  - "Paste Transaction Link" — form with tx hash URL
  - (Phase 4 adds "Pay via FVM Contract" button here)
- Add comments section at bottom

#### [MODIFY] Milestone Detail Page — `app/dashboard/milestones/[id]/page.tsx`
- Same status banners
- Same "Complete Payment" dropdown
- Same comments section

#### [NEW] Comments Component — `components/dashboard/comments-section.tsx`
- Reusable component for rendering comment threads
- Props: `targetType`, `targetId`
- Shows comment list with author avatar, name, relative time
- "Internal note" badge for private comments
- New comment form with "Post" button and "Internal note" toggle for org members

---

## Phase 2: FVM Smart Contract Development

**Goal:** Build Solidity contracts for on-chain grant management on Filecoin. These contracts handle fund pooling, payment disbursement, and provide on-chain receipts.

### 2A. Contract Architecture

We'll build two core contracts:

1. **GrantsVault.sol** — Holds funds for a grant program. Manager deposits FIL/USDC, contract disburses to builders when authorized.
2. **GrantsRegistry.sol** — On-chain registry of grant programs. Records program creation, application approvals, and payment events. Provides verifiable on-chain receipts.

#### [NEW] `smart-contracts/contracts/GrantsVault.sol`

```
GrantsVault (per program, deployed via factory)
├── deposit()  — manager deposits FIL (payable) or USDC (ERC-20 transferFrom)
├── disburseNative(recipient, amount)  — sends FIL to builder (onlyAuthorized)
├── disburseERC20(token, recipient, amount)  — sends USDC to builder (onlyAuthorized)
├── getBalance()  — view FIL balance
├── getERC20Balance(token)  — view token balance
├── withdraw(amount)  — manager reclaims unused funds
└── Events: Deposited, Disbursed, Withdrawn
```

Key design decisions:
- **Per-program vaults**: Each grant program gets its own vault contract (deployed via factory). This isolates funds between programs.
- **Authorized callers**: The vault owner (program manager) authorizes disbursements. In future, multi-sig or DAO governance can replace this.
- **Dual token support**: Native FIL via `msg.value` + ERC-20 USDC via standard `transferFrom`/`transfer`.

#### [NEW] `smart-contracts/contracts/GrantsVaultFactory.sol`

Factory that deploys GrantsVault instances:
```
GrantsVaultFactory
├── createVault(programId)  — deploys a new GrantsVault, returns address
├── getVault(programId)  — look up vault address by program ID
├── vaults  — mapping(bytes32 programId => address vault)
└── Events: VaultCreated
```

#### [NEW] `smart-contracts/contracts/interfaces/IERC20.sol`
Standard ERC-20 interface for USDC interactions.

#### [DELETE] `smart-contracts/contracts/Counter.sol`
Remove the boilerplate Counter contract.

#### [DELETE] `smart-contracts/contracts/Counter.t.sol`
Remove the boilerplate Counter test.

### 2B. Contract Tests (Solidity)

#### [NEW] `smart-contracts/contracts/GrantsVault.t.sol`

Solidity tests using forge-std `Test` base contract:
- `testDeployVault` — factory deploys vault correctly
- `testDepositNative` — manager deposits FIL
- `testDepositERC20` — manager deposits USDC (using mock ERC20)
- `testDisburseNative` — authorized caller sends FIL to builder
- `testDisburseERC20` — authorized caller sends USDC to builder
- `testDisburseUnauthorized` — non-authorized caller reverts
- `testWithdraw` — manager reclaims unused funds
- `testWithdrawUnauthorized` — non-owner withdrawal reverts
- `testDisburseInsufficientBalance` — reverts on overdraft
- Fuzz tests: `testFuzzDepositAndDisburse(uint256 amount)` — deposit random amount, disburse up to balance

#### [NEW] `smart-contracts/contracts/mocks/MockERC20.sol`
Minimal ERC20 for testing (mint, transfer, approve, transferFrom).

### 2C. Hardhat Config Update

#### [MODIFY] `smart-contracts/hardhat.config.ts`

Add Filecoin Calibration testnet network:
```typescript
filecoinCalibration: {
  type: "http",
  chainType: "l1",
  url: configVariable("FILECOIN_CALIBRATION_RPC_URL"),
  accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
},
```

Note: Filecoin Calibration RPC URL is `https://api.calibration.node.glif.io/rpc/v1` (chain ID 314159).

---

## Phase 3: FVM Frontend Integration

**Goal:** Wire the smart contracts into the GrantsApp frontend so managers can fund programs and disburse payments through the UI.

### 3A. Package Installation

Install in the **root** Next.js project (not smart-contracts):
- `@rainbow-me/rainbowkit` — wallet connection UI
- `wagmi` — React hooks for Ethereum
- `viem` — low-level Ethereum client
- `@tanstack/react-query` — required peer dependency for wagmi

### 3B. Wallet Configuration

#### [NEW] `lib/wagmi.ts`
- Configure wagmi with Filecoin Calibration chain
- Set up transports (HTTP provider to Filecoin RPC)

#### [NEW] `components/providers/web3-provider.tsx`
- Wrap app in `WagmiProvider` + `QueryClientProvider` + `RainbowKitProvider`
- Configure RainbowKit with Filecoin Calibration chain

#### [MODIFY] `app/layout.tsx`
- Add `Web3Provider` wrapper around existing providers

### 3C. Connect Wallet UI

#### [NEW] `components/dashboard/connect-wallet.tsx`
- "Connect Wallet" button using RainbowKit's `ConnectButton`
- Shows connected address when connected
- Shown in dashboard sidebar or user profile

#### [MODIFY] Dashboard Sidebar — `components/dashboard/sidebar.tsx`
- Add wallet connection status indicator

### 3D. Payment Integration UI

#### [MODIFY] Application Detail Page — `app/dashboard/applications/[id]/page.tsx`
- In the "Complete Payment" dropdown, add option:
  - "Pay via FVM Contract" — opens payment modal
  - Only shown when wallet is connected and program has a vault

#### [NEW] `components/dashboard/payment-modal.tsx`
- Modal for FVM payment flow:
  1. Shows payment details (amount, currency, recipient wallet)
  2. "Fund Program" button (if vault needs funding) — calls `deposit()`
  3. "Disburse to Builder" button — calls `disburseNative()` or `disburseERC20()`
  4. Shows transaction status (pending → confirmed)
  5. On success, calls Convex `recordPayment` mutation with tx hash

### 3E. Contract Deployment Script

#### [NEW] `smart-contracts/ignition/modules/GrantsVaultFactory.ts`
- Hardhat Ignition module to deploy the GrantsVaultFactory to Filecoin Calibration
- Records deployed address for frontend consumption

#### [NEW] `lib/contracts.ts`
- Export contract ABIs and deployed addresses
- Helper functions: `getVaultFactory()`, `getVault(address)`

### 3F. Convex Schema Update for On-Chain State

#### [MODIFY] [schema.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/schema.ts)

Add on-chain fields to `programs` table:
```typescript
// FVM on-chain fields
vaultAddress: v.optional(v.string()),       // deployed GrantsVault address
vaultChainId: v.optional(v.number()),       // 314159 for Calibration
vaultFundedAmount: v.optional(v.number()),  // total deposited into vault
```

#### [MODIFY] [programs.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/programs.ts)
- Add `setVaultAddress` mutation — records the vault address after deployment
- Add `updateVaultFunding` mutation — updates funded amount after deposit tx

---

## Phase 4: Polish & Remaining Features

**Goal:** Complete remaining polish items and add Nearn-inspired enhancements.

### 4A. Manager Dashboard Enhancement (H5 partial)

#### [MODIFY] `app/dashboard/page.tsx`
- Add inline program cards in ManagerOverview (currently just shows count + link)
- Show top 3 programs with name, status badge, application count, budget remaining

### 4B. Custom Application Questions

#### [MODIFY] [schema.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/schema.ts)
- Add `customQuestions` to `programs` table:
```typescript
customQuestions: v.optional(v.array(v.object({
  id: v.string(),
  label: v.string(),
  type: v.union(v.literal("text"), v.literal("textarea"), v.literal("url")),
  required: v.boolean(),
}))),
```

- Add `customAnswers` to `applications` table:
```typescript
customAnswers: v.optional(v.array(v.object({
  questionId: v.string(),
  answer: v.string(),
}))),
```

#### [MODIFY] Program creation form — `app/dashboard/programs/new/page.tsx`
- Add custom questions builder (add/remove/reorder questions)

#### [MODIFY] Apply form — `app/grants/[slug]/apply/page.tsx`
- Render custom questions dynamically based on program config

### 4C. Program Visibility Toggle

#### [MODIFY] [schema.ts](file:///c:/Users/Win8.1/OneDrive/Desktop/grantsapp/convex/schema.ts)
- Add to `programs`: `visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted")))`

#### [MODIFY] Program creation/edit forms
- Add visibility dropdown

#### [MODIFY] Grants explorer — `app/grants/page.tsx`
- Filter out unlisted programs from public feed

### 4D. Builder Earning Stats

#### [MODIFY] Builder profile page — `app/builders/[username]/page.tsx`
- Show aggregated stats: total earned, grants won, submissions count
- Source from existing denormalized data or compute from applications query

---

## Verification Plan

### Automated Tests (Smart Contracts)

Run Solidity tests with Hardhat 3:
```bash
cd smart-contracts
npx hardhat test solidity
```

This will execute all `*.t.sol` files in the `contracts/` directory. Expected tests:
- GrantsVault deployment, deposit, disburse, withdraw
- Access control (unauthorized calls revert)
- Insufficient balance reverts
- Fuzz tests for deposit/disburse amounts

### Manual Verification (Frontend)

After implementation, verify the following flows in the browser at `http://localhost:3000`:

**Payment Tracking Flow:**
1. Sign in as a manager → Create a program → Publish it
2. Sign in as a builder (different account) → Apply to the program → Submit
3. As manager → Approve the application → Verify "Payment Pending" banner appears
4. Click "Complete Payment" → "Record Manual Payment" → Enter amount + tx reference
5. Verify status changes to "Paid" with green checkmark

**Comments Flow:**
1. As builder → Open an approved application → Post a comment in the comments section
2. As manager → Open same application → See builder's comment → Post a reply
3. As manager → Toggle "Internal note" → Post → Verify builder can't see it
4. As builder → Verify internal note is not visible

**Milestone Payment Flow:**
1. As builder → Submit a milestone
2. As manager → Approve milestone → Verify "Payment Pending" banner
3. Record payment → Verify "Paid" status

**FVM Integration (requires wallet):**
1. Connect MetaMask to Filecoin Calibration testnet
2. As manager → Create program → Deploy vault (creates on-chain contract)
3. Fund vault with test FIL
4. Approve an application → "Pay via FVM Contract" → Execute on-chain disbursement
5. Verify tx hash recorded in Convex + builder notification sent

### Convex Dev Server

The Convex dev server should be running during frontend testing:
```bash
npx convex dev
```

And the Next.js dev server:
```bash
pnpm run dev
```
