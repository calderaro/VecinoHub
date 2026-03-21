# Neighborhood Fund Management Implementation Plan

## Purpose
This plan translates the approved neighborhood fund design into an execution sequence for VecinoHub. It is intended to be implementation-ready for engineering work, code review, QA, and release planning.

This plan assumes the canonical contract already defined in:
- `docs/PRD.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/PERMISSIONS.md`
- `docs/SCREENS.md`
- `docs/QA.md`

## Scope Summary

### In Scope for MVP
- Multiple named funds per neighborhood.
- Fund list and fund detail experiences for residents and neighborhood admins.
- Group-scoped dues and payment status tracking.
- One-off charge periods and recurring charge templates.
- Resident payment submission flow for active group members.
- Admin confirmation and rejection of fund payments.
- Append-only fund ledger with derived balances.
- Manual income, expense, and adjustment movements.
- SSR-first reads and tRPC-only mutations.

### Explicitly Out of Scope for MVP
- External payment provider integrations.
- Receipt or attachment uploads.
- Automated late fees or penalties.
- Bank reconciliation workflows.
- Person-level dues outside the `group` model.
- Fund-to-fund transfers.
- Unified treasury reporting across fundraising campaigns and funds.

## Implementation Principles
- Preserve the existing separation between `fundraising` and `funds`.
- Keep all business rules, calculations, and permission checks in `src/services/funds.ts`.
- Use SSR for fund list/detail reads and tRPC only for writes and interactive form actions.
- Treat ledger entries as append-only. Corrections use reversals, not destructive edits.
- Keep the payer entity as `group` for MVP.
- Enforce neighborhood and fund consistency on every cross-entity write.
- Avoid introducing mutable “current balance” storage; derive it from movements.

## Delivery Strategy
Implement the feature in vertical milestones that produce usable internal checkpoints:

1. Schema and service foundation.
2. Admin fund setup and ledger controls.
3. Resident payment and transparency flows.
4. QA hardening, seed data, and release readiness.

This order minimizes rework because UI depends on stable service contracts, and service contracts depend on a correct data model.

## Workstreams
- Data model and migration
- Service layer and guards
- tRPC router
- SSR pages and client forms
- Navigation and shared components
- Seed/demo data
- QA and verification
- Rollout and release

## Milestone 0: Final Technical Decisions
Goal: remove ambiguity before schema work starts.

### Decisions to lock
- Fund names must be unique within a neighborhood.
- Residents can see group-level due status for all groups in the neighborhood.
- Resident-facing status boards must not show payer identity.
- Neighborhoods do not require an automatic default fund in production.
- Seed/demo data may include a `General Fund` for convenience.
- Payment submission UI in MVP allocates to one charge period at a time, even though the schema supports multi-period allocations.
- `amount_paid` on `fund_group_charges` is stored as a service-maintained cache for query speed.

### Deliverables
- Canonical docs already updated.
- This implementation plan approved.

### Exit Criteria
- No unresolved product ambiguity remains that would change schema shape.

## Milestone 1: Data Model and Migration
Goal: introduce the `funds` domain in Drizzle without touching existing fundraising behavior.

### 1.1 Schema updates
Update `src/db/schema.ts` with:
- enums:
  - `fund_status`
  - `fund_template_status`
  - `fund_charge_frequency`
  - `fund_charge_period_status`
  - `fund_group_charge_status`
  - `fund_payment_status`
  - `fund_payment_method`
  - `fund_movement_type`
  - `fund_entry_side`
- tables:
  - `neighborhood_funds`
  - `fund_charge_templates`
  - `fund_charge_periods`
  - `fund_group_charges`
  - `fund_payment_submissions`
  - `fund_payment_allocations`
  - `fund_movements`

### 1.2 Required constraints
- Unique fund name per neighborhood using a case-insensitive uniqueness strategy consistent with the repo.
- Unique (`period_id`, `group_id`) on `fund_group_charges`.
- Unique (`payment_id`, `group_charge_id`) on `fund_payment_allocations`.
- Foreign keys across all fund-owned tables.
- Indexes for:
  - neighborhood scoping
  - `fund_id`
  - `group_id`
  - movement timeline reads
  - payment moderation reads
  - charge-period list reads

### 1.3 Migration generation
- Run `npm run db:generate`.
- Review generated SQL carefully.
- Run `npm run db:migrate` locally on a clean database.

### 1.4 Backfill and migration policy
- Do not auto-create a default fund for every neighborhood in production migrations.
- Keep migration additive and safe for existing installations.
- Handle “no funds yet” via empty-state UI.
- Add optional seed/demo creation of one or more funds in `npm run seed`.

### 1.5 Acceptance criteria
- Existing app flows still build against the updated schema.
- Migration applies cleanly on a blank database.
- Migration applies cleanly on a database that already contains neighborhoods, groups, fundraising campaigns, posts, and events.
- No current fundraising table or behavior is altered.

## Milestone 2: Service Foundation
Goal: establish a reliable `funds` domain API in the service layer before UI work begins.

### 2.1 New module
Create `src/services/funds.ts`.

### 2.2 Supporting helpers
Add internal helpers for:
- `requireFundAccess`
- `requireFundAdminScope`
- `requireFundGroupMemberScope`
- `getFundRecord`
- `getFundPeriodRecord`
- `getGroupChargeRecord`
- `assertFundNeighborhoodConsistency`
- `computeGroupChargeStatus`
- `computeFundBalance`
- `allocatePaymentToGroupCharge`

### 2.3 Validation schemas
Add Zod schemas in the service layer for:
- fund create/update
- charge template create/update
- charge period create
- payment submit
- payment confirm/reject
- expense/manual income/adjustment create
- reversal create
- waive charge
- filter and pagination inputs

### 2.4 Core invariants
Implement and enforce:
- a fund belongs to exactly one neighborhood
- a charge template belongs to exactly one fund and one neighborhood
- a charge period belongs to exactly one fund and one neighborhood
- a group charge belongs to one period and one group
- a payment submission belongs to one fund, one neighborhood, and one group
- allocations can only point at group charges in the same fund and neighborhood
- only confirmed payments create ledger movements
- reversals create compensating movements instead of deleting rows

### 2.5 Acceptance criteria
- Service helpers compile and are covered by basic unit-style tests when tests are added.
- Permission failures throw `ServiceError` with existing project codes.
- Cross-neighborhood and cross-fund mismatches are rejected in services, not in the UI.

## Milestone 3: Fund Administration Setup
Goal: let admins create and manage named funds before period/payment flows are exposed.

### 3.1 Admin service methods
Implement:
- `listNeighborhoodFunds`
- `createNeighborhoodFund`
- `updateNeighborhoodFund`
- `getNeighborhoodFundOverview`

### 3.2 Overview data shape
`getNeighborhoodFundOverview` should provide:
- fund metadata
- derived balance
- open periods count
- overdue group-charge count
- pending payment count
- recent movements summary
- recent periods summary

### 3.3 Admin SSR pages
Build:
- `/admin/[neighborhoodId]/fund`
- `/admin/[neighborhoodId]/fund/new`
- `/admin/[neighborhoodId]/fund/[fundId]`
- `/admin/[neighborhoodId]/fund/[fundId]/edit`

### 3.4 UI requirements
- Table or cards for all funds in the neighborhood.
- Balance display per fund.
- Empty state when no funds exist.
- Clear CTA to create the first fund.
- Test ids for fund rows, create actions, and overview cards.

### 3.5 Acceptance criteria
- Neighborhood admin can create multiple named funds in an authorized neighborhood.
- Duplicate fund names in the same neighborhood are rejected.
- Neighborhood admin cannot access or manage funds in a foreign neighborhood.
- Platform admin can perform the same actions across neighborhoods.

## Milestone 4: Charge Templates and Charge Periods
Goal: model recurring dues and generate collectible due periods.

### 4.1 Admin service methods
Implement:
- `createFundChargeTemplate`
- `updateFundChargeTemplate`
- `listFundChargePeriods`
- `createFundChargePeriod`
- `generateFundChargePeriod`
- `getFundPeriodDetail`

### 4.2 Generation rules
For `createFundChargePeriod` and `generateFundChargePeriod`:
- determine eligible groups from active group memberships in the target neighborhood
- create one `fund_group_charges` row per active group
- set `amount_due`
- initialize `amount_paid = 0`
- initialize status as `unpaid`

### 4.3 Important service rules
- A generated period must never include a group from another neighborhood.
- Re-running a generation command for the same logical template period must be guarded against duplicates.
- Closed or cancelled periods must not accept new allocations unless explicitly reopened in a future version.

### 4.4 Admin SSR pages
Build:
- `/admin/[neighborhoodId]/fund/[fundId]/periods`
- `/admin/[neighborhoodId]/fund/[fundId]/periods/new`
- `/admin/[neighborhoodId]/fund/[fundId]/periods/[periodId]`

### 4.5 UI requirements
- List periods with due date, total expected amount, collected amount, and payment-status counts.
- Detail page with per-group rows and filterable status chips.
- Template creation/edit controls scoped to a fund.

### 4.6 Acceptance criteria
- Admin can create one-off periods directly.
- Admin can create recurring templates and generate periods from them.
- Each generated period creates one charge row per active group.
- Period detail page displays unpaid, partial, paid, overdue, and waived counts correctly.

## Milestone 5: Payment Submission and Moderation
Goal: support resident payment submission and admin confirmation.

### 5.1 Resident service methods
Implement:
- `getGroupFundSummary`
- `getResidentFundDashboard`
- `submitFundPayment`

### 5.2 Admin payment methods
Implement:
- `confirmFundPayment`
- `rejectFundPayment`
- `waiveFundGroupCharge`

### 5.3 Submission rules
- Only active group members can submit a payment for that group.
- MVP form submits against one visible period at a time.
- Submission stores a `fund_payment_submissions` row with `submitted` status.
- Submission does not change fund balance or `amount_paid`.

### 5.4 Confirmation transaction
When confirming a payment:
1. Validate admin scope.
2. Validate the payment still has `submitted` status.
3. Validate the target charge still belongs to the same fund and neighborhood.
4. Create one or more `fund_payment_allocations`.
5. Update affected `fund_group_charges.amount_paid`.
6. Recompute and persist each affected group charge status.
7. Insert a `fund_movements` row with type `payment` and side `credit`.
8. Mark the payment `confirmed` and store confirmer metadata.

### 5.5 Rejection rules
- Mark payment as `rejected`.
- Store rejection reason if supplied.
- Do not create movement rows.
- Do not modify `amount_paid`.

### 5.6 Resident routes
Build:
- `/dashboard/[groupId]/fund`
- `/dashboard/[groupId]/fund/[fundId]`
- `/dashboard/[groupId]/fund/[fundId]/[periodId]`
- `/dashboard/[groupId]/fund/[fundId]/[periodId]/pay`

### 5.7 Admin moderation UX
On period detail page:
- list pending submissions
- allow confirm/reject actions
- show allocation target and amount
- show resident identity only in admin view

### 5.8 Resident UX
- Show current due amount for the active group.
- Show the group’s paid, partial, unpaid, or overdue state.
- Show recent confirmed movements for transparency.
- Show neighborhood-wide group status board without payer identity.

### 5.9 Acceptance criteria
- Residents can submit payments only for their own active groups.
- Admin confirmation updates both the ledger and the group charge.
- Rejection does not update the ledger.
- Partial payment results in `partial`.
- Full payment results in `paid`.
- Resident screens do not reveal payer identity for other groups.

## Milestone 6: Manual Ledger Movements
Goal: let admins record non-payment fund movements.

### 6.1 Service methods
Implement:
- `listFundMovements`
- `recordFundExpense`
- `recordFundManualIncome`
- `recordFundAdjustment`
- `reverseFundMovement`

### 6.2 Movement rules
- `expense` creates `debit`
- `manual_income` creates `credit`
- `adjustment` may create either `credit` or `debit`
- `reverseMovement` inserts a compensating movement with the opposite side and a source link
- residents only see confirmed movement history

### 6.3 Admin pages
Build:
- `/admin/[neighborhoodId]/fund/[fundId]/movements/new-expense`
- `/admin/[neighborhoodId]/fund/[fundId]/movements/new-income`
- optional adjustment action inline or in settings page

### 6.4 Acceptance criteria
- Admin can record expense and manual income rows.
- Fund balance updates correctly based on movements.
- Reversal preserves audit history and recalculates balance correctly.

## Milestone 7: Router Integration
Goal: expose write flows through tRPC while keeping routers thin.

### 7.1 Add router
Create `src/server/trpc/routers/funds.ts`.

### 7.2 Router responsibilities
- input parsing only
- invoke service methods only
- map errors with `handleServiceError`
- no business logic

### 7.3 Router procedures
Add:
- `listFunds`
- `getOverview`
- `listPeriods`
- `getPeriodDetail`
- `listMovements`
- `getGroupSummary`
- `createFund`
- `updateFund`
- `createChargeTemplate`
- `updateChargeTemplate`
- `createChargePeriod`
- `generateChargePeriod`
- `submitPayment`
- `confirmPayment`
- `rejectPayment`
- `recordExpense`
- `recordManualIncome`
- `recordAdjustment`
- `waiveGroupCharge`
- `reverseMovement`

### 7.4 Acceptance criteria
- Router signatures match `docs/API.md`.
- Routers compile without duplicated validation logic.

## Milestone 8: Navigation and Shared UI
Goal: integrate the new feature into the existing app shell coherently.

### 8.1 Navigation
Update shared navigation to add:
- resident `Funds` entry under dashboard navigation
- admin `Funds` entry inside neighborhood admin navigation

### 8.2 Shared components
Build shared UI building blocks for:
- fund summary cards
- balance KPI cards
- period status badges
- payment status badges
- movement list rows
- fund empty states

### 8.3 Test ids
Add explicit test ids for:
- fund lists
- fund cards
- period rows
- group-charge rows
- payment actions
- movement rows
- create/edit forms

### 8.4 Acceptance criteria
- Navigation appears only for authorized roles.
- New routes are discoverable from existing dashboard/admin shells.

## Milestone 9: Seed Data and Local Demo Flows
Goal: make the feature easy to verify locally.

### 9.1 Seed updates
Update seed logic to create:
- at least one neighborhood with multiple funds
- at least one recurring template
- at least one one-off period
- paid, partial, unpaid, and overdue group charges
- confirmed and rejected payments
- expense and manual income movements

### 9.2 Demo data targets
Recommended sample funds:
- `General Fund`
- `Security Fund`
- `Reserve Fund`

### 9.3 Acceptance criteria
- `npm run seed` produces visible, testable fund data.
- QA can exercise core flows without manual DB setup.

## Milestone 10: QA, Testing, and Hardening
Goal: validate correctness, permissions, and regression safety.

### 10.1 Service-level tests
Add tests for:
- create fund with duplicate name rejection
- foreign-neighborhood access rejection
- period generation creates the right group charges
- payment confirmation creates allocations and movements transactionally
- rejected payments do not affect balance
- reversal logic preserves audit history
- resident read restrictions
- payer-identity privacy rules

### 10.2 UI/integration coverage
Add coverage for:
- admin fund creation
- admin period creation
- resident payment submission
- admin payment moderation
- balance change after confirmation
- movement history rendering
- no-funds empty state

### 10.3 Manual QA alignment
Update or execute `docs/QA.md` flows for:
- multi-fund neighborhood navigation
- resident access and visibility rules
- admin-only mutation rules
- responsive behavior on fund pages

### 10.4 Acceptance criteria
- `npm run lint` passes.
- `npm run build` passes.
- new tests pass.
- manual QA checklist passes for all touched flows.

## Milestone 11: Release Readiness
Goal: ship safely without destabilizing existing modules.

### 11.1 Backward-compatibility checks
- confirm no route regressions in existing fundraising pages
- confirm shared navigation still renders correctly
- confirm no permission regressions for group, poll, event, and post modules

### 11.2 Release checklist
- migrations reviewed
- seed data updated
- docs updated
- QA evidence captured
- monitoring/logging notes added if needed

### 11.3 Rollout strategy
- ship behind normal auth and role checks only; no feature flag required unless team prefers staged rollout
- if staged rollout is desired, hide nav entries until seed/demo and QA complete

## Recommended Execution Order
Use this exact engineering order unless a blocking dependency changes:

1. Schema and migrations
2. Service helpers and validators
3. Fund create/update + admin overview
4. Charge templates and periods
5. Payment submission and confirmation
6. Manual ledger movements
7. Router integration
8. Resident/admin pages
9. Navigation and shared components
10. Seed data
11. Tests and QA

## Suggested PR Breakdown

### PR 1: Schema foundation
- schema updates
- migration
- seed scaffolding
- no UI

### PR 2: Funds service foundation
- service helpers
- fund create/update
- overview reads
- no public UI beyond admin list if desired

### PR 3: Charge periods and payment domain
- templates
- periods
- group charges
- payment confirmation transaction

### PR 4: Admin UI
- fund list
- fund detail
- period detail
- movement forms

### PR 5: Resident UI
- resident fund list/detail
- pay flow
- status board

### PR 6: Tests and hardening
- automated tests
- QA updates
- seed improvements

## Technical Risks

### Risk 1: Cached `amount_paid` drifting from allocations
Mitigation:
- update charge amounts only inside service transactions
- never let routers or pages write these fields directly
- add reconciliation tests

### Risk 2: Cross-fund allocation bugs
Mitigation:
- validate fund and neighborhood lineage before every allocation
- centralize allocation logic in one helper

### Risk 3: Performance regressions on overview pages
Mitigation:
- aggregate with SQL
- avoid N+1 reads for period and movement summaries
- paginate movement history

### Risk 4: Privacy leaks on resident pages
Mitigation:
- define resident/admin response shapes separately
- never return submitter identity in resident service methods

## Engineering Notes
- Prefer adding minimal reusable components instead of over-abstracting early.
- Keep status derivation logic centralized and deterministic.
- Do not reuse `fundraising` UI or service code by force; shared helpers are fine, domain conflation is not.
- Use the existing `ServiceError`, `getServiceContext`, and `handleServiceError` patterns.
- Keep all new read-heavy pages SSR-first.

## Definition of Done
The neighborhood fund management MVP is done when:
- admins can create and manage multiple named funds in a neighborhood
- admins can create periods and record fund movements
- residents can view balances, movements, and due status
- residents can submit payments for their active groups
- admins can confirm or reject payments
- balances are derived correctly from the append-only ledger
- permissions and privacy rules are enforced server-side
- docs, seed data, tests, and QA are updated

## First Execution Recommendation
Start with Milestone 1 and Milestone 2 in the same branch:
- schema + migration
- `src/services/funds.ts` foundation
- no UI yet

That gives the rest of the work a stable contract and keeps the first review focused on the hardest part: domain correctness.
