# Derived Resident Neighborhood Access Implementation Plan

## 1. Executive Summary

VecinoHub currently stores both `neighborhood_memberships` and `group_memberships`, but the resident access model has drifted: an active `neighbor` neighborhood membership can outlive all active group memberships and still grant neighborhood-scoped resident access. Product direction is now stricter:

- regular residents must access a neighborhood only through at least one active group membership in that neighborhood
- `neighborhood_admin` access remains explicit and does not depend on group membership
- `neighbor` neighborhood memberships remain in the schema, but become synchronized support records rather than independent resident access grants

This plan refactors the authorization model, synchronization rules, and historical data so the runtime behavior matches that product rule.

## 2. Feature Goal

Make resident neighborhood access derived from active group membership while preserving explicit administrative neighborhood access.

Expected product behavior:
- a resident with one or more active groups in a neighborhood can access neighborhood-scoped resident surfaces there
- a resident with zero active groups in a neighborhood cannot access resident pages or resident data in that neighborhood, even if an active `neighbor` row still exists
- leaving or being removed from the last active group in a neighborhood inactivates the synchronized `neighbor` membership there
- accepting an invite into a group restores both group access and synchronized `neighbor` status for that neighborhood
- `neighborhood_admin` users can still manage their neighborhood without belonging to a group

## 3. Success Criteria

The refactor is complete when all of the following are true:
- all resident neighborhood-scoped reads and writes require an active group membership in the target neighborhood, unless the actor is `neighborhood_admin` or `platform_admin`
- active standalone `neighbor` rows no longer grant resident access by themselves
- accepting an invite into a neighborhood with no current resident access restores synchronized `neighbor` membership and group access
- leaving or removal from the last active group in a neighborhood inactivates the corresponding `neighbor` neighborhood membership
- leaving one group while the user still has another active group in the same neighborhood keeps the `neighbor` membership active
- neighborhood admins continue to function without group membership regressions
- existing data is backfilled so invalid resident neighborhood access is removed
- lint, tests, and build pass after the refactor

## 4. Scope

### In Scope
- permission model refactor for resident neighborhood access
- synchronization rules between `group_memberships` and `neighborhood_memberships`
- service-layer guard updates
- invite acceptance and leave/remove flow updates
- data backfill for inconsistent existing memberships
- docs, QA, and test coverage updates

### Out of Scope
- removing the `neighbor` role from the schema
- full deletion of `neighborhood_memberships` for residents
- historical audit redesign
- bulk remediation tools beyond the one-time backfill
- new UI features unrelated to access correctness

## 5. Product Decisions

These decisions should be treated as the working specification.

### 5.1 Administrative neighborhood access stays explicit
- `platform_admin` remains global
- `neighborhood_admin` remains explicit via `neighborhood_memberships`
- a `neighborhood_admin` may have zero active groups in the neighborhood and still retain administrative access

### 5.2 Resident neighborhood access is derived
- regular residents do not gain or retain neighborhood access independently
- the source of truth for resident access is active `group_memberships` joined through the group’s `neighborhood_id`
- any guard for resident neighborhood access must derive from active groups, not merely from `neighbor` rows

### 5.3 `neighbor` memberships remain synchronized support records
- `neighbor` rows remain in `neighborhood_memberships` for compatibility and simplified queries
- they are still written by the application
- they are considered synchronized records, not primary authorization truth
- they should be active only while the user has at least one active group membership in that neighborhood

### 5.4 Last-group behavior
- when a resident leaves or is removed from their last active group in a neighborhood, the corresponding `neighbor` membership must become `inactive`
- if the user still has at least one active group in the same neighborhood, the `neighbor` membership remains active

### 5.5 Invite acceptance behavior
- accepting a group invite creates or reactivates:
  - the `group_memberships` row
  - the synchronized `neighbor` `neighborhood_memberships` row
- invite acceptance remains valid for a user who currently has zero active groups in the neighborhood

## 6. Current Problem Analysis

### 6.1 Current inconsistency
Today the codebase treats an active `neighbor` membership as sufficient for many resident neighborhood checks. That creates two classes of bugs:
- access leaks: a user can keep neighborhood-scoped resident access after leaving their last group
- lifecycle drift: the DB can say a user is an active neighbor even though they are not an active member of any group in that neighborhood

### 6.2 Why the current model is risky
- authorization meaning is split across two tables without a strict precedence rule
- leave/remove flows can revoke group access but forget to revoke neighborhood-level resident access
- QA becomes harder because “active neighbor” no longer means “active resident”
- future features may accidentally reintroduce the leak by checking only `neighborhood_memberships`

### 6.3 Why Option A is preferable
Option A preserves the existing schema and admin model while tightening semantics. It is lower-risk than removing resident neighborhood memberships entirely and better aligned with the current codebase.

## 7. Architecture Impact

### 7.1 Services and guards
The main architectural shift is in authorization helpers:
- resident-facing neighborhood checks must derive from active group membership
- admin-facing neighborhood checks remain explicit
- guard helper APIs should make the distinction obvious to reduce future misuse

### 7.2 Data synchronization
Membership synchronization becomes a first-class service concern:
- any write that activates a `group_membership` may need to activate a `neighbor` row
- any write that inactivates or deletes a `group_membership` may need to inactivate a `neighbor` row if no active groups remain in the neighborhood

### 7.3 Read model
Resident reads should never assume the synchronized `neighbor` row is authoritative. The row is a convenience and compatibility artifact, not the authorization source.

## 8. Data Model and State Semantics

### 8.1 Tables involved
- `groups`
- `group_memberships`
- `neighborhood_memberships`

### 8.2 Effective authorization semantics
- `platform_admin`: unconditional
- `neighborhood_admin`: active `neighborhood_memberships` row with role `neighborhood_admin`
- resident: at least one active `group_memberships` row whose group belongs to the target neighborhood

### 8.3 Synchronized resident neighborhood state
For a given `(user_id, neighborhood_id)`:
- if active group count in the neighborhood is `> 0`, the `neighbor` membership should be `active`
- if active group count in the neighborhood is `0`, the `neighbor` membership should be `inactive`
- this rule applies only to `role = neighbor`
- it must never demote or inactivate a `neighborhood_admin` membership

### 8.4 No schema change required for phase 1
This refactor can be completed without adding new columns or enums. It is primarily a behavior and synchronization change.

Optional follow-up:
- if future audit needs grow, consider adding explicit membership-end metadata later

## 9. Detailed Implementation Plan

### Phase 1. Guard and authorization foundation

Objective:
- centralize the new access rule before changing feature flows

Tasks:
- audit all guard helpers in `src/services/guards.ts`
- identify which helpers are:
  - explicit admin checks
  - resident neighborhood checks
  - group membership checks
- add or refactor helpers so the code expresses intent clearly, for example:
  - `requireNeighborhoodAdminOrPlatform`
  - `requireResidentNeighborhoodAccess`
  - `listResidentNeighborhoodIdsForUser`
- update any existing helper that currently returns neighborhood ids from active `neighbor` rows for regular residents
- ensure resident neighborhood scope resolution comes from active groups joined to groups.neighborhood_id

Expected outputs:
- one clear helper path for resident neighborhood access
- no ambiguous helper that treats `neighbor` rows as standalone resident authorization

Acceptance criteria:
- resident helper results change when the user loses their last active group
- neighborhood admin helper behavior remains unchanged

### Phase 2. Synchronization utilities

Objective:
- create reusable service helpers for keeping `neighbor` rows aligned with group state

Tasks:
- implement a helper that counts active groups by `(user_id, neighborhood_id)`
- implement a helper that ensures an active `neighbor` row exists when active group count becomes `> 0`
- implement a helper that inactivates the `neighbor` row when active group count becomes `0`
- make the helper ignore `neighborhood_admin` rows
- decide whether to:
  - update an existing `neighbor` row
  - insert a new `neighbor` row if missing
  - leave `neighborhood_admin` rows untouched

Recommended helper surface:
- `ensureResidentNeighborhoodMembership(neighborhoodId, userId)`
- `syncResidentNeighborhoodMembership(neighborhoodId, userId)`
- `countActiveGroupsInNeighborhood(neighborhoodId, userId)`

Acceptance criteria:
- helpers are idempotent
- repeated calls produce stable results
- helpers never downgrade `neighborhood_admin`

### Phase 3. Write-path integration

Objective:
- apply synchronization to all writes that can change effective resident access

Primary flows to update:
- invite acceptance
- direct member add/reactivation
- group leave
- admin remove member
- neighborhood membership deactivation flows that cascade to groups
- any other service that inactivates or reactivates `group_memberships`

Detailed tasks:
- on invite acceptance:
  - create/reactivate group membership
  - ensure active `neighbor` row
- on `groups.addMember`:
  - ensure active `neighbor` row after activating group membership
- on `groups.leave`:
  - inactivate current group membership
  - recompute active group count in the group’s neighborhood
  - inactivate `neighbor` row only if no active groups remain
- on `groups.removeMember`:
  - after removal, recompute synchronized `neighbor` state for the target user
- on neighborhood membership admin changes:
  - confirm existing logic for inactivating a whole neighborhood still works
  - ensure future reactivation does not create resident access without a group

Acceptance criteria:
- every group-membership activation path activates synchronized resident neighborhood status
- every last-group removal path inactivates synchronized resident neighborhood status

### Phase 4. Resident read-path refactor

Objective:
- eliminate resident access checks that trust `neighbor` rows alone

Likely affected areas:
- dashboard routing and group resolution
- neighborhood-scoped list pages
- polls
- fundraising
- funds
- events
- posts
- any service calling `listNeighborhoodIdsForUser` or `requireNeighborhoodMember`

Tasks:
- audit every call site that relies on resident neighborhood membership
- split admin scope resolution from resident scope resolution where needed
- update service queries so regular residents scope neighborhoods through active groups
- verify multi-neighborhood behavior still works correctly when driven by groups

Acceptance criteria:
- a resident with zero active groups in a neighborhood cannot read any resident neighborhood data there
- a neighborhood admin without group membership still can access admin surfaces there

### Phase 5. Backfill and remediation

Objective:
- correct existing production data to match the new rule

Backfill rule:
- for every active `neighbor` membership:
  - if the user has zero active groups in the same neighborhood, set the row to `inactive`
- do not touch `neighborhood_admin` rows

Tasks:
- write a one-time script under `scripts/`
- log counts:
  - active `neighbor` rows inspected
  - rows inactivated
  - rows skipped because they are `neighborhood_admin`
- dry-run capability is recommended
- run locally against staging/dev data first

Acceptance criteria:
- post-backfill, no active `neighbor` row exists for a user with zero active groups in that neighborhood, unless the user is a `neighborhood_admin`

### Phase 6. UI and navigation verification

Objective:
- ensure user-facing routing and screens match the new authorization model

Tasks:
- verify `/dashboard` resolves only from active groups
- verify leaving the last group removes that neighborhood from resident switching logic
- verify pending invites still work when the user has no active groups left
- confirm no resident page shows stale access because of synchronized `neighbor` rows

Acceptance criteria:
- resident navigation is driven by actual active groups
- zero-group users land in the correct empty or invites state

### Phase 7. Tests and QA

Objective:
- lock the model in with service and end-to-end coverage

Required service tests:
- resident with one active group has neighborhood access
- resident with zero active groups but active `neighbor` row is denied neighborhood access
- invite acceptance activates resident neighborhood synchronization
- leaving one of multiple groups in the same neighborhood keeps `neighbor` active
- leaving the last group in a neighborhood inactivates `neighbor`
- removing a member from the last group in a neighborhood inactivates `neighbor`
- neighborhood admin without group membership still has admin access
- re-adding neighborhood membership alone does not restore resident access without a group

Required manual QA updates:
- access control matrix
- leave-group flow
- invite accept flow after previously leaving last group
- multi-neighborhood switching

Required Playwright coverage:
- resident loses neighborhood-derived access after leaving last group
- admin retains access without group membership
- accepting a new invite restores the resident neighborhood

## 10. File-by-File Change Map

Expected implementation touchpoints:

- `src/services/guards.ts`
  - new resident neighborhood guard semantics
- `src/services/groups.ts`
  - synchronization on add/remove/leave flows
- `src/services/group-invites.ts`
  - synchronization on acceptance
- `src/services/*`
  - any resident neighborhood-scoped services that currently rely on neighborhood membership alone
- `scripts/*`
  - backfill/remediation script
- `tests/services/*`
  - access-control and synchronization tests
- `docs/API.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

## 11. Risks and Mitigations

### Risk: unintended resident access regressions
Cause:
- resident scope helpers are used broadly across the codebase

Mitigation:
- refactor guard helpers first
- add focused access-control tests before broad cleanup
- update services incrementally and verify with build plus targeted tests

### Risk: neighborhood admins lose access accidentally
Cause:
- over-aggressive synchronization logic or shared guard changes

Mitigation:
- keep admin guard path explicit and separate
- never apply resident synchronization logic to `neighborhood_admin`
- add dedicated tests for admin-without-group behavior

### Risk: stale data persists after deploy
Cause:
- historical `neighbor` rows remain active after behavior change

Mitigation:
- ship backfill script
- run on staging first
- verify counts before and after

### Risk: hidden call sites continue to trust `neighbor` membership
Cause:
- scattered service-level scope logic

Mitigation:
- grep all neighborhood membership checks
- consolidate helper usage
- add regression tests around known vulnerable flows

## 12. Rollout Strategy

Recommended order:
1. update docs
2. add/refactor guards
3. add synchronization helpers
4. wire critical write paths
5. wire resident read paths
6. add tests
7. run backfill in non-production environment
8. deploy code
9. run backfill in target environment
10. perform manual QA

Recommended deployment note:
- deploy code and backfill close together so stale active `neighbor` rows do not create confusing transitional states

## 13. Open Questions to Resolve During Implementation

- whether any resident feature intentionally depends on a standalone `neighbor` row today for non-group-specific onboarding
- whether neighborhood switching in `UserMenu` should list neighborhoods from active groups only for residents
- whether backfill should inactivate or delete stale `neighbor` rows

Recommended answers:
- no standalone resident access should remain
- resident neighborhood switching should come from active groups only
- inactivate, do not delete, to preserve history and reduce migration risk

## 14. Definition of Done

This work is done when:
- docs reflect the derived resident neighborhood model
- residents cannot access a neighborhood without an active group there
- neighborhood admins still can
- synchronized `neighbor` rows stay aligned with active group counts
- historical data is remediated
- tests, lint, and build pass
- QA checklists and Playwright run docs are updated
