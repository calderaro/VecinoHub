# Neighborhood Fund Management Proposal

## Status
- Proposed feature design.
- This document is intentionally not yet a source of truth.
- If approved, the next step is to update `docs/PRD.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/PERMISSIONS.md`, `docs/SCREENS.md`, and `docs/QA.md`.

## Problem
VecinoHub already supports campaign-based fundraising, but it does not support the ongoing operational fund a neighborhood uses for regular dues and expenses.

Current gaps:
- Residents cannot see the current neighborhood fund balance.
- There is no auditable ledger for income, expenses, and adjustments.
- There is no recurring due/assessment model.
- There is no neighborhood-wide view of which groups have paid, partially paid, or not paid.
- Campaign fundraising and neighborhood treasury management are mixed concerns and should stay separate.

## Product Goal
Add a neighborhood fund module that lets a neighborhood:
- Track the current fund balance.
- Publish transparent money movements to all active neighborhood members.
- Create recurring or one-off dues.
- Track what each group owes for each due period.
- Let residents submit fund payments for their own group.
- Let admins confirm payments and record expenses/adjustments.
- Show who is paid, unpaid, overdue, or partially paid.

## Recommended Domain Boundary

### Keep fundraising and fund management separate
- `fundraising` remains for optional, goal-based campaigns.
- `fund management` becomes the ongoing treasury and dues system.

This avoids overloading `fundraising_campaigns` with recurring obligations, expenses, and running-balance logic.

### Use groups as the paying entity
The repo already models households as `groups`, and votes/contributions are already group-scoped. The cleanest MVP is:
- dues are owed by `group`
- any active member of that group can submit a payment
- neighborhood transparency shows payment status at the `group` level
- admin detail can show which user submitted or confirmed a payment

This matches the existing tenant and permission model better than introducing person-level dues immediately.

## Core User Stories

### Resident
- As a resident, I can open a fund page and see the current neighborhood balance.
- As a resident, I can see confirmed income and expense movements.
- As a resident, I can see current and past due periods, how much my group owes, and whether my group is paid.
- As a resident, I can submit a payment for my own group.
- As a resident, I can see which groups are paid, partially paid, unpaid, or overdue for a due period.

### Neighborhood admin
- As a neighborhood admin, I can create recurring dues for the neighborhood fund.
- As a neighborhood admin, I can create one-off dues.
- As a neighborhood admin, I can confirm or reject submitted payments.
- As a neighborhood admin, I can record expenses, manual income, and adjustments.
- As a neighborhood admin, I can review an audit-friendly movement history and payment status by group.

## Proposed MVP Scope

### Included
- Multiple named funds per neighborhood.
- Ledger-based balance derived from confirmed movements.
- Monthly recurring dues plus one-off dues.
- Per-group obligation tracking.
- Payment submission and admin confirmation flow.
- Expense tracking.
- Group-level payment status visibility for all active neighborhood members.

### Deferred
- Bank reconciliation.
- Receipt upload / invoice attachment.
- Automatic late fees or penalties.
- Person-level dues instead of group-level dues.
- Payment provider integrations.
- Export/reporting beyond basic CSV.
- Cross-posting fundraising campaign contributions into the fund ledger.

## Conceptual Model

### 1. Fund
Each neighborhood can have multiple named fund records. Each fund owns:
- display name
- currency
- status
- visibility rules

Examples:
- General maintenance fund
- Security fund
- Emergency reserve fund

### 2. Charge template
A template defines how dues repeat:
- title
- description
- frequency
- default amount per group
- due-day or explicit due date rules

Examples:
- Monthly maintenance fee
- Quarterly security fee

### 3. Charge period
A period is the actual charge issued for a specific month or date.

Examples:
- Maintenance fee for March 2026
- Special repair fee due April 15, 2026

The period is what residents see and pay against.

### 4. Group charge
For each active group in the neighborhood, a period generates one obligation row:
- amount due
- amount paid
- status: unpaid, partial, paid, overdue, waived

This is the source of truth for “who has paid and who has not paid”.

### 5. Payment submission
A resident submits a payment for their own group:
- method
- amount
- paid date
- optional reference / notes
- status: submitted, confirmed, rejected

Submitted payments do not affect the fund balance until confirmed.

### 6. Movement ledger
The fund balance is the sum of confirmed ledger movements only.

Movement types:
- opening_balance
- payment
- expense
- manual_income
- adjustment
- reversal

Recommended rule:
- movements are append-only
- mistakes are corrected with reversal entries, not silent edits

## Proposed Data Model

### New enums
- `fund_status`: `active`, `archived`
- `fund_charge_frequency`: `monthly`, `quarterly`, `annual`, `one_off`
- `fund_charge_period_status`: `open`, `closed`, `cancelled`
- `fund_group_charge_status`: `unpaid`, `partial`, `paid`, `overdue`, `waived`
- `fund_payment_status`: `submitted`, `confirmed`, `rejected`
- `fund_payment_method`: `cash`, `wire_transfer`
- `fund_movement_type`: `opening_balance`, `payment`, `expense`, `manual_income`, `adjustment`, `reversal`
- `fund_entry_side`: `credit`, `debit`

### New tables

#### `neighborhood_funds`
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `name`
- `description` (nullable)
- `currency_code`
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

Notes:
- multiple rows per neighborhood are allowed in MVP
- add a unique constraint on (`neighborhood_id`, `name`) if product wants fund names unique per neighborhood

#### `fund_charge_templates`
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `frequency`
- `default_amount`
- `due_day_of_month` (nullable)
- `starts_on`
- `ends_on` (nullable)
- `status` (`active`, `paused`, `archived`)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

Notes:
- `one_off` templates are allowed but optional
- `neighborhood_id` is kept for direct scoping and consistency with current domain tables

#### `fund_charge_periods`
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `template_id` (fk -> fund_charge_templates.id, nullable)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `amount_per_group`
- `due_date`
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

Notes:
- admin can create one-off periods directly without a template
- period records freeze the due amount and due date for that issue cycle

#### `fund_group_charges`
- `id` (pk)
- `period_id` (fk -> fund_charge_periods.id)
- `group_id` (fk -> groups.id)
- `amount_due`
- `amount_paid`
- `status`
- `waived_by` (fk -> users.id, nullable)
- `waived_reason` (nullable)
- `created_at`
- `updated_at`
- Unique: (`period_id`, `group_id`)

Notes:
- `amount_paid` may be cached for query speed, but must stay service-owned
- status is derived from amount and due date in the service layer if we want to avoid drift

#### `fund_payment_submissions`
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `group_charge_id` (fk -> fund_group_charges.id)
- `group_id` (fk -> groups.id)
- `submitted_by` (fk -> users.id)
- `method`
- `amount`
- `paid_at`
- `reference` (nullable)
- `notes` (nullable)
- `status`
- `confirmed_by` (fk -> users.id, nullable)
- `confirmed_at` (nullable)
- `rejection_reason` (nullable)
- `created_at`
- `updated_at`

Notes:
- payments are the user-submitted record
- a confirmed payment should create one or more movement and allocation rows inside the same transaction

#### `fund_payment_allocations`
- `id` (pk)
- `payment_id` (fk -> fund_payment_submissions.id)
- `group_charge_id` (fk -> fund_group_charges.id)
- `amount`
- `created_at`
- Unique: (`payment_id`, `group_charge_id`)

Notes:
- this allows partial payments and one payment covering multiple periods
- MVP UI can still keep submission simple by allocating to one period at a time

#### `fund_movements`
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `type`
- `entry_side`
- `amount`
- `effective_at`
- `description`
- `source_type` (`payment`, `expense`, `adjustment`, `opening_balance`, `reversal`)
- `source_id` (nullable)
- `created_by` (fk -> users.id)
- `created_at`

Notes:
- append-only ledger
- running balance is derived from `credit - debit`
- only confirmed movements should be visible to residents

## Balance Rules
- The neighborhood fund balance is derived, not manually stored.
- Formula: sum(all `credit` movements) - sum(all `debit` movements).
- Payment submissions do not hit the balance until confirmed.
- Rejecting a payment creates no movement.
- Reversing a confirmed movement creates a compensating movement, never a destructive delete.
- Waiving a due does not change balance by itself; it changes expected receivables, not available cash.

## Permission Model

### Platform admin
- Full read/write across all neighborhoods.

### Neighborhood admin
- Create/update fund settings for authorized neighborhoods.
- Create and manage multiple named funds in authorized neighborhoods.
- Create recurring templates and one-off periods.
- Confirm/reject payments.
- Record expenses, manual income, opening balance, and adjustments.
- View payer identity and full audit details.

### Neighbor
- Read current balance and confirmed movements for their active neighborhood.
- Read due periods and group-level collection status for their active neighborhood.
- Submit payments only for groups where they have active membership.
- Read their own group obligations and their own submitted payment detail.

### Group admin
- Same fund permissions as any active group member unless you later want delegated reminders or group-only exports.

## Privacy Recommendation
To satisfy the transparency requirement without exposing unnecessary personal data:
- resident-facing status boards should show `group` payment status
- resident-facing movement history should not show submitter identity
- admin-facing detail can show `submitted_by`, `confirmed_by`, and notes

This keeps “who paid / who did not pay” at the household level, which matches the existing data model and is less sensitive than exposing a person’s name.

## Service Layer Proposal
Create a new service module: `src/services/funds.ts`

Suggested read methods:
- `listNeighborhoodFunds(ctx, { neighborhoodId })`
- `getNeighborhoodFundOverview(ctx, { neighborhoodId, fundId })`
- `listFundMovements(ctx, { neighborhoodId, fundId, page, type? })`
- `listFundChargePeriods(ctx, { neighborhoodId, fundId, status?, page })`
- `getFundPeriodDetail(ctx, { periodId })`
- `getGroupFundSummary(ctx, { groupId, fundId })`
- `getResidentFundDashboard(ctx, { groupId, fundId })`

Suggested mutations:
- `createNeighborhoodFund(ctx, input)`
- `updateNeighborhoodFund(ctx, input)`
- `createFundChargeTemplate(ctx, input)`
- `updateFundChargeTemplate(ctx, input)`
- `createFundChargePeriod(ctx, input)`
- `generateFundChargePeriod(ctx, input)`
- `submitFundPayment(ctx, input)`
- `confirmFundPayment(ctx, input)`
- `rejectFundPayment(ctx, input)`
- `recordFundExpense(ctx, input)`
- `recordFundManualIncome(ctx, input)`
- `recordFundAdjustment(ctx, input)`
- `waiveFundGroupCharge(ctx, input)`
- `reverseFundMovement(ctx, input)`

Service rules:
- all neighborhood scoping happens in the service
- all balances and status transitions are computed server-side
- confirming a payment must be transactional:
  1. validate membership and scope
  2. mark payment confirmed
  3. create allocation rows
  4. create payment movement row
  5. update affected `fund_group_charges`

## tRPC Router Proposal
Add `src/server/trpc/routers/funds.ts`.

Example surface:
- `funds.createFund`
- `funds.updateFund`
- `funds.submitPayment`
- `funds.confirmPayment`
- `funds.rejectPayment`
- `funds.createChargeTemplate`
- `funds.updateChargeTemplate`
- `funds.createChargePeriod`
- `funds.recordExpense`
- `funds.recordManualIncome`
- `funds.recordAdjustment`
- `funds.waiveCharge`
- `funds.reverseMovement`

Query policy:
- SSR pages should call `funds` services directly for read-heavy pages
- tRPC is only for writes and highly interactive client actions

## Screen Proposal

### Resident routes
- `/dashboard/[groupId]/fund`
  - list of neighborhood funds
  - summary cards per fund
  - resident picks a fund to inspect
- `/dashboard/[groupId]/fund/[fundId]`
  - balance card
  - current due summary for the resident’s group
  - latest confirmed movements
  - payment-status table by group for the current period
  - CTA to submit payment
- `/dashboard/[groupId]/fund/[fundId]/[periodId]`
  - period detail
  - own group obligation
  - neighborhood payment-status board
- `/dashboard/[groupId]/fund/[fundId]/[periodId]/pay`
  - payment submission form

### Admin routes
- `/admin/[neighborhoodId]/fund`
  - fund list
  - balances and overdue counts by fund
  - create fund CTA
- `/admin/[neighborhoodId]/fund/new`
  - create named fund
- `/admin/[neighborhoodId]/fund/[fundId]`
  - balance
  - overdue groups
  - pending payment submissions
  - recent movements
  - active recurring templates
- `/admin/[neighborhoodId]/fund/[fundId]/edit`
- `/admin/[neighborhoodId]/fund/[fundId]/periods`
  - list of periods with collection progress
- `/admin/[neighborhoodId]/fund/[fundId]/periods/new`
  - create one-off or generated period
- `/admin/[neighborhoodId]/fund/[fundId]/periods/[periodId]`
  - group-by-group payment status
  - confirm/reject submissions
- `/admin/[neighborhoodId]/fund/[fundId]/movements/new-expense`
- `/admin/[neighborhoodId]/fund/[fundId]/movements/new-income`
- `/admin/[neighborhoodId]/fund/[fundId]/settings`

## UI Contract

### Resident dashboard expectations
- SSR-first overview page.
- Transparent, easy-to-scan balance and movement history.
- Current period status chips per group: paid, partial, unpaid, overdue.
- Test ids on all list rows, filters, submission actions, and status chips.

### Admin expectations
- Multi-fund list is SSR and lets admins switch clearly between named funds.
- Pending submissions are actionable from the period detail screen.
- Movement forms are client components backed by React Hook Form.
- Period list and overview are SSR pages using services directly.

## Relationship To Existing Fundraising

### Recommended behavior
- keep `fundraising_campaigns` untouched
- add a new navigation item for `Funds`
- keep campaign contributions and fund payments as separate domains

### Why
- campaigns represent optional or special-purpose collection drives
- neighborhood fund dues represent recurring operational obligations
- expenses and running balance belong to a treasury ledger, not a campaign table

## Migration / Rollout Proposal

### Phase 1
- Add new schema and service layer.
- Add support for multiple named funds per neighborhood from the start.
- Backfill existing neighborhoods with an optional default `General Fund` only if needed for seed/demo data.
- Support one-off periods, monthly dues, payment submission, confirmation, expense recording, and resident transparency.

### Phase 2
- Add recurring period generation automation.
- Add CSV export and printable collection reports.
- Add receipt/evidence uploads.

### Phase 3
- Add optional link from campaign contributions into fund movements if product wants a unified treasury view.

## QA Additions
If this proposal is implemented, `docs/QA.md` should gain coverage for:
- residents can view fund balance and movements only for authorized neighborhoods
- residents can only view funds that belong to their active neighborhood
- residents can only submit payments for their own active groups
- neighborhood admins can confirm/reject payments only in their neighborhoods
- confirmed payments update both period status and balance
- rejected payments do not change balance
- partial payment updates status to `partial`
- overdue periods transition correctly after due date
- residents can see group-level paid/unpaid status but not payer identity
- waiving a charge removes it from overdue/expected totals without changing cash balance
- reversing a movement preserves audit history and recalculates balance correctly

## Risks And Tradeoffs

### 1. Reusing fundraising tables would look cheaper but create domain confusion
Campaigns have goal-driven semantics; treasury funds need ledger semantics.

### 2. Group-level obligations fit the current app best
If you later need person-level dues, the system can evolve by changing the obligation owner from `group` to `user`, but starting there would cut across the current model.

### 3. Partial payment support increases complexity but avoids a future redesign
That is why `fund_payment_allocations` is recommended even if the first UI only allocates to one period.

### 4. Transparency has privacy implications
Showing group payment status is likely acceptable. Showing the exact resident who paid should stay admin-only.

## Recommendation
Implement this as a new `funds` domain, not as an extension of `fundraising`.

Best MVP shape:
- multiple named funds per neighborhood
- dues owed by group
- append-only ledger
- confirmed movements determine balance
- resident-visible group payment status
- admin-only confirmation and expense controls

## Open Questions
- Should the public status board show exact amount paid per group, or only `paid / partial / unpaid / overdue`?
- Should admins be able to close a period and freeze further allocations, or only rely on due dates plus status?
- Does the product want a visible “expected receivables” total in addition to current cash balance?
- Should opening balances be required during setup for existing neighborhoods?
- Should the app support manual payment entries by admins for offline collections on behalf of a group in MVP?
