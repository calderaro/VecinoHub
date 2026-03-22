# Group Access Requests Implementation Plan

## 1. Executive Summary

VecinoHub already supports manager-initiated group invites and derives resident
neighborhood access from active group membership. The missing onboarding path is
user-initiated access for registered residents who are not yet members of a
group.

This plan adds a secure, approval-based request flow that allows a signed-in,
registered user to request access to a group and, by extension, its
neighborhood. The request itself grants no access. Access is created only when
an authorized reviewer approves the request.

The proposal is intentionally aligned with the current codebase:

- keep SSR-first reads and tRPC-only mutations
- reuse the existing membership synchronization rules in
  `src/services/resident-neighborhoods.ts`
- mirror the current invite architecture in `src/services/group-invites.ts`
- avoid introducing any public resident access through a standalone
  `neighbor` record
- avoid a global public neighborhood directory

## 2. Current State Analysis

### 2.1 What already exists

The repo now has a complete invite system:

- `group_invites` exists in `src/db/schema.ts`
- invite lifecycle and email delivery live in `src/services/group-invites.ts`
- invite mutations are exposed through `src/server/trpc/routers/group-invites.ts`
- `/dashboard/invites` exists and `/dashboard` redirects there when a user has
  pending invites but no groups
- group managers already review pending invites from
  `/dashboard/[groupId]/members`

The repo also now enforces derived resident neighborhood access:

- resident neighborhood access is derived from active group membership
- synchronized `neighbor` rows are maintained by
  `src/services/resident-neighborhoods.ts`
- invite acceptance and group membership writes already call the synchronization
  helpers

### 2.2 What does not exist yet

- no request model for registered users who want to join a group
- no public-safe neighborhood or group discovery flow for non-members
- no manager review queue for user-initiated membership requests
- no request history page for the requester
- no dedicated API or schema for request approval/rejection

### 2.3 Constraints from the current architecture

The implementation must fit these current constraints:

- reads should stay SSR-first where practical
- writes must go through tRPC
- services own validation, permissions, and DB access
- regular resident neighborhood access must still derive from active group
  membership
- existing invite behavior must remain intact
- current docs treat group membership as the resident access source of truth

### 2.4 Why this feature should not reuse invites directly

Invites and requests solve different trust models:

- invites are manager-initiated and email-address targeted
- requests are user-initiated and reviewer-approved

Trying to represent a request as an invite would distort ownership and audit
semantics. The cleaner model is a sibling feature with parallel lifecycle rules
and shared membership-activation helpers.

## 3. Feature Goal

Allow a signed-in, registered user to request access to a specific group in a
specific neighborhood without granting immediate access, while giving authorized
group/neighborhood/platform managers a clear approval workflow.

Expected product behavior:

- a registered user with no membership can submit a request to join a group
- the request captures enough context for a human reviewer to decide
- the requester can see the status of their own requests
- authorized reviewers can approve or reject requests within their scope
- approval creates or reactivates the requester's `group_membership`
- approval also creates or reactivates the synchronized `neighbor`
  `neighborhood_membership`
- rejection or cancellation does not create access

## 4. Scope

### In Scope

- request submission flow for authenticated users
- request review flow for group admins, neighborhood admins, and platform admins
- request persistence, status lifecycle, and audit metadata
- controlled neighborhood/group discovery for request creation
- requester-facing status page
- manager-facing review queue
- documentation, QA checklist, and Playwright test-run updates

### Out of Scope

- anonymous or signed-out access requests
- automatic approval rules
- role requests for `group_admin`
- replacing the existing invite flow
- broad public directory or browse-all-neighborhoods experience
- file uploads or document verification
- background jobs as a hard dependency

## 5. Product Decisions

These decisions are the recommended working specification for implementation.

### 5.1 Registered-user only

Only authenticated users may create requests.

Reasoning:

- the app already has a verified-account auth flow
- requests can be tied directly to `users.id`
- this avoids a second anonymous onboarding system
- it reduces spam and simplifies approval auditability

### 5.2 Requests target a group, not a standalone neighborhood membership

The primary request object should target one group. The request also stores the
group's `neighborhood_id` for scoping and consistency.

Reasoning:

- resident neighborhood access is derived from active group membership
- approving a group request naturally grants both group access and synchronized
  resident neighborhood state
- standalone `neighbor` access is explicitly not a valid resident access grant

### 5.3 Default approved role is always `group_member`

A request approval should grant `group_member` only.

Reasoning:

- it is the least privileged resident role
- `group_admin` should remain an explicit post-approval manager action
- this matches the current permission posture

### 5.4 No access on request creation

Creating a request must never create:

- `group_memberships`
- `neighborhood_memberships`
- active neighborhood context
- new resident visibility into neighborhood content

### 5.5 Controlled discovery, not a global public directory

Do not expose a browse-all list of neighborhoods or groups.

Recommended MVP discovery:

- add a dedicated signed-in request flow
- resolve neighborhoods by exact slug lookup
- once a valid active neighborhood slug is entered, return only requestable
  groups in that neighborhood

Optional hardening follow-up:

- add a join code or signed request link later if slug-only discovery feels too
  open

### 5.6 One pending request per requester plus group

Only one `pending` request may exist for the same `(requested_by, group_id)`.

Reasoning:

- keeps queues readable
- prevents accidental spam or duplicate review work
- matches the repo's existing invite deduplication philosophy

### 5.7 Requests should expire

Pending requests should expire lazily after 30 days.

Reasoning:

- keeps review queues fresh
- avoids long-lived stale requests
- can be enforced on reads and writes without a background job

### 5.8 Minimal but useful request context

The request form should capture:

- target neighborhood slug
- target group
- optional note from the requester

The note should be short and bounded, for example 500 characters.

Optional follow-up fields:

- phone number
- address confirmation
- household note

These should be deferred unless reviewers confirm they need more data to make
decisions reliably.

### 5.9 Managers review within existing scope rules

The same roles that can manage invites should review access requests:

- `group_admin` for their own group
- `neighborhood_admin` for groups in their neighborhood
- `platform_admin` globally

### 5.10 No requester-driven cross-account behavior

Requests are bound to the signed-in user account only. A user cannot submit a
request on behalf of another email address or account.

## 6. Proposed User Flows

### 6.1 Resident submits a new request

1. User signs in.
2. User opens `/dashboard/request-access` from:
   - the no-group waiting state
   - an optional profile or user-menu link
3. User enters a neighborhood slug.
4. System resolves that slug through a public-safe lookup for active
   neighborhoods only.
5. System shows requestable groups for that neighborhood.
6. User selects one group and submits an optional note.
7. System creates a `pending` request.
8. User sees the request in their own request history.

### 6.2 Resident views request history

1. User opens `/dashboard/request-access`.
2. SSR read loads:
   - current pending requests
   - recent request history
3. User can cancel their own `pending` request.
4. Closed states remain visible as history.

### 6.3 Group or neighborhood reviewer approves

1. Reviewer opens the group members page or neighborhood admin detail page.
2. Reviewer sees pending access requests for the group.
3. Reviewer approves a request.
4. Service transaction:
   - creates or reactivates `group_memberships` with role `group_member`
   - calls `ensureResidentNeighborhoodMembership`
   - marks request `approved`
5. Requester gains access immediately after refresh.

### 6.4 Reviewer rejects

1. Reviewer rejects a `pending` request.
2. Request becomes `rejected`.
3. No membership rows are created.
4. Requester sees the closed status in history.

### 6.5 Requester cancels

1. Requester cancels their own `pending` request.
2. Request becomes `cancelled`.
3. Reviewer queues no longer show it as pending.

### 6.6 Existing member or already-approved user

If the user already has active membership in the target group:

- request creation must be rejected

If the user became a member through another path while a request was still
pending:

- approval should remain idempotent
- the request should still close as `approved`

## 7. Data Model Proposal

### 7.1 New enum

Add a new enum in `src/db/schema.ts`:

- `group_access_request_status`
  - `pending`
  - `approved`
  - `rejected`
  - `cancelled`
  - `expired`

### 7.2 New table

Add `group_access_requests`:

- `id` (pk)
- `group_id` (fk -> groups.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `requested_by` (fk -> users.id)
- `status`
- `note` (nullable)
- `reviewed_by` (fk -> users.id, nullable)
- `reviewed_at` (nullable)
- `approved_at` (nullable)
- `rejected_at` (nullable)
- `cancelled_at` (nullable)
- `expires_at`
- `created_at`
- `updated_at`

### 7.3 Constraints and indexes

Required:

- unique pending request per `(group_id, requested_by)`
- index on `(group_id, status)`
- index on `(neighborhood_id, status)`
- index on `(requested_by, status)`
- index on `expires_at`

Recommended service invariant:

- `group_access_requests.neighborhood_id` must always equal
  `groups.neighborhood_id`

### 7.4 Why duplicate `neighborhood_id`

The table could derive neighborhood through `groups`, but duplicating
`neighborhood_id` is worth it because:

- it mirrors the current invite model
- it simplifies scoped queries
- it makes cross-neighborhood consistency validation explicit

## 8. Service Layer Design

Create a new module: `src/services/group-access-requests.ts`.

### 8.1 Read methods

- `listMyGroupAccessRequests(ctx)`
  - returns the current user's pending requests and history
- `listGroupAccessRequests(ctx, { groupId })`
  - returns pending requests and history for one group
- `lookupNeighborhoodForAccessRequest(ctx, { slug })`
  - resolves a public-safe active neighborhood for exact slug input
  - must not require existing membership
- `listRequestableGroupsForNeighborhood(ctx, { neighborhoodId })`
  - returns groups that can accept requests

### 8.2 Mutation methods

- `createGroupAccessRequest(ctx, { groupId, note })`
- `cancelGroupAccessRequest(ctx, { requestId })`
- `approveGroupAccessRequest(ctx, { requestId })`
- `rejectGroupAccessRequest(ctx, { requestId })`

### 8.3 Validation rules

On create:

- requester must be authenticated and active
- target group must exist
- target neighborhood must be active
- requester must not already hold active membership in the group
- existing pending request for the same group and requester must be rejected
- note length must be bounded
- request expiry must be set

On approve/reject:

- only authorized reviewer scope may act
- request must still be actionable
- expired pending requests should be lazily transitioned to `expired`

On cancel:

- only the original requester may cancel
- only `pending` requests may be cancelled

### 8.4 Approval transaction

Approval should run in one transaction:

1. load request and verify scope
2. create or reactivate `group_memberships`
3. call `ensureResidentNeighborhoodMembership`
4. mark request `approved`, `reviewed_by`, `reviewed_at`, `approved_at`

### 8.5 Shared helper reuse

Do not duplicate resident neighborhood synchronization logic.

The request-approval path should reuse:

- `ensureResidentNeighborhoodMembership`
- existing group membership upsert patterns from the invite and groups services

If duplication starts to appear across:

- invite acceptance
- direct member add
- request approval

extract a shared helper such as:

- `upsertGroupMembershipWithResidentSync(executor, { groupId, userId, role })`

## 9. Discovery and Visibility Design

### 9.1 Recommended MVP approach

Use exact neighborhood slug lookup from a protected, signed-in page.

Why this is the best current fit:

- the repo has no public directory today
- `getNeighborhoodBySlug` currently requires existing membership or platform
  admin, so a new public-safe lookup can be added without destabilizing existing
  authorization checks
- the user must already be authenticated, which reduces abuse
- approval still protects actual access

### 9.2 Public-safe lookup contract

The public-safe neighborhood lookup must return only minimal metadata:

- neighborhood id
- neighborhood name
- neighborhood slug

The group list should return only what is needed to submit a request:

- group id
- group name
- optional address if product wants it visible

It must not leak:

- members
- admins
- counts unless explicitly approved
- posts, events, funds, polls, or other neighborhood content

### 9.3 Future hardening option

If slug-based discovery is considered too open after review, add either:

- a neighborhood-level join code
- or signed request links generated by managers

This can be added later without changing the request approval model.

## 10. API Contract Proposal

Add a new router: `groupAccessRequests`.

Recommended procedures:

- `groupAccessRequests.listMine` (query, authenticated)
- `groupAccessRequests.lookupNeighborhood` (query, authenticated)
- `groupAccessRequests.listRequestableGroups` (query, authenticated)
- `groupAccessRequests.create` (mutation, authenticated)
- `groupAccessRequests.cancel` (mutation, authenticated requester only)
- `groupAccessRequests.listForGroup` (query, group admin / neighborhood admin / platform admin)
- `groupAccessRequests.approve` (mutation, reviewer scope)
- `groupAccessRequests.reject` (mutation, reviewer scope)

Router rules:

- keep router logic thin
- delegate all permission and lifecycle logic to the service
- map `ServiceError` only

## 11. UI and Routing Plan

### 11.1 New resident page

Add `/dashboard/request-access`.

Responsibilities:

- show a request form
- show the current user's pending requests and history
- support cancel action
- remain accessible even when the user has zero group memberships

### 11.2 Dashboard root behavior

Keep the existing redirect for pending invites.

Recommended behavior:

- if no groups and pending invites exist, continue redirecting to `/dashboard/invites`
- if no groups and no invites exist, keep the no-group state but add a
  prominent request-access CTA
- if pending requests exist, show a status summary in the no-group state or on
  the request-access page rather than forcing a redirect

Reasoning:

- invites are immediately actionable, so the current redirect remains useful
- requests are informational after submission, so a forced redirect is less
  valuable

### 11.3 Requester UI structure

Recommended layout on `/dashboard/request-access`:

- hero/header
- neighborhood slug input
- neighborhood lookup state
- group selector
- optional note textarea
- submit button
- pending requests section
- history section

### 11.4 Manager UI surfaces

Primary review surface:

- `/dashboard/[groupId]/members`

Secondary admin review surface:

- `/admin/[neighborhoodId]/groups/[groupId]`

Recommended rendering:

- pending access requests section near the existing pending invites section
- each request row shows:
  - requester name
  - requester email
  - optional note
  - created date
  - approve and reject actions

### 11.5 Test ids

Add test ids for:

- request page root
- neighborhood slug lookup input
- request form group selector
- request form note input
- request submit button
- request history rows
- requester cancel action
- manager request row
- approve action
- reject action

## 12. Permissions and Security Rules

### 12.1 Requester rules

- must be authenticated
- may create requests only for their own account
- may see only their own requests
- may cancel only their own pending requests

### 12.2 Reviewer rules

- `group_admin` may review requests for their own groups only
- `neighborhood_admin` may review requests for groups in their neighborhood
- `platform_admin` may review any request

### 12.3 Access boundaries

Before approval:

- requester gains no neighborhood read access
- requester gains no group read access
- requester must not be able to infer private neighborhood content from the
  request surface

After approval:

- access is granted only through active group membership
- synchronized `neighbor` membership is updated as a support record

### 12.4 Abuse controls

Recommended controls:

- one pending request per group per requester
- server-side validation on every mutation
- lazy expiry
- bounded note length
- rate limiting for request creation and repeated lookup attempts if practical

### 12.5 Cross-neighborhood consistency

Every approval path must validate:

- request.neighborhood_id matches the group's neighborhood
- membership activation happens only for the approved group
- no reviewer can act outside their scope

## 13. Email and Notifications

### 13.1 Recommendation for MVP

Keep the first implementation functional without making manager email
notifications mandatory.

Suggested MVP:

- requester sees status in-app
- reviewer sees queue in-app
- existing toast pattern is reused

### 13.2 Follow-up enhancement

After the core request model is stable, optionally add:

- email to group admins when a new request arrives
- email to requester when approved or rejected

Because the repo already has mail infrastructure for invites, these can be
layered in later with low architectural risk.

## 14. Detailed Implementation Phases

### Phase 1. Finalize product rules and documentation

Tasks:

- confirm the slug-based MVP discovery decision
- confirm request approval always grants `group_member`
- confirm whether request notes are optional or required
- confirm expiry window, recommended 30 days
- document the feature in PRD and the main implementation index

Acceptance criteria:

- written spec exists and is approved before schema work starts

### Phase 2. Schema and migration

Tasks:

- add `group_access_request_status` enum to `src/db/schema.ts`
- add `group_access_requests` table
- add indexes and unique pending constraint
- generate migration via Drizzle Kit
- review migration before applying

Acceptance criteria:

- schema matches the plan
- migration applies cleanly

### Phase 3. Service layer

Tasks:

- add `src/services/group-access-requests.ts`
- implement lookup, list, create, cancel, approve, reject
- add lazy expiry helper
- reuse resident neighborhood synchronization helpers
- add idempotent approval behavior

Acceptance criteria:

- service methods enforce all validation and scope rules
- approval and cancellation behave correctly under repeated calls

### Phase 4. tRPC router

Tasks:

- add `src/server/trpc/routers/group-access-requests.ts`
- register it in `src/server/trpc/router.ts`
- keep router inputs explicit and thin

Acceptance criteria:

- all writes flow through tRPC
- all service errors map through existing handler patterns

### Phase 5. Resident request page

Tasks:

- add `/dashboard/request-access`
- SSR-load current user request history
- add client interactions for lookup and request submission
- add cancel action
- add translations and test ids

Acceptance criteria:

- a user with zero groups can request access without using any existing group
  page
- request history is visible and actionable

### Phase 6. Dashboard and no-group state integration

Tasks:

- update `NoGroupState` usage on `/dashboard`
- add request-access CTA
- optionally show pending-request summary
- preserve existing invite redirect logic

Acceptance criteria:

- invite behavior does not regress
- users without groups have a clear next step

### Phase 7. Manager review UI

Tasks:

- add request review section to `/dashboard/[groupId]/members`
- add request review section to `/admin/[neighborhoodId]/groups/[groupId]`
- add approve/reject actions with confirmation and toasts
- refresh view after actions

Acceptance criteria:

- group managers can review requests in the same place they already manage
  invites and members

### Phase 8. Docs, QA, and Playwright coverage

Tasks:

- update `docs/API.md`
- update `docs/DATA_MODEL.md`
- update `docs/PERMISSIONS.md`
- update `docs/SCREENS.md`
- update `docs/QA.md`
- update `docs/PLAYWRIGHT_TEST_RUNS.md`
- add end-to-end tests for the new request flow

Acceptance criteria:

- documentation matches implemented behavior
- QA coverage includes both requester and reviewer paths

## 15. QA Plan

Minimum manual and automated coverage should include:

- user with no groups can open `/dashboard/request-access`
- exact slug lookup for active neighborhoods works
- invalid or inactive neighborhood lookup fails safely
- user can submit one request for a group
- duplicate pending request for the same group is rejected
- user can cancel their own pending request
- user cannot cancel another user's request
- pending request creates no resident access before approval
- group admin can approve a request for their own group
- group admin cannot approve a request for another group's request
- neighborhood admin can approve within their neighborhood only
- platform admin can approve globally
- approval creates active `group_membership`
- approval creates or reactivates synchronized `neighbor` membership
- rejection closes the request without creating access
- user with pending request still cannot open resident group pages
- request expiry is enforced lazily and expired requests are not actionable
- invite flows still work unchanged

## 16. Documentation Update Matrix

When implementation starts or lands, update the following docs:

- `docs/PRD.md`
  - add the new resident self-service request flow
- `docs/DATA_MODEL.md`
  - add enum and table details for `group_access_requests`
- `docs/API.md`
  - document `groupAccessRequests` router
- `docs/PERMISSIONS.md`
  - add requester and reviewer permissions
- `docs/SCREENS.md`
  - add `/dashboard/request-access` and manager review sections
- `docs/QA.md`
  - add manual QA items for request creation, approval, rejection, and security
- `docs/PLAYWRIGHT_TEST_RUNS.md`
  - add execution notes for new end-to-end coverage
- `docs/IMPLEMENTATION_PLAN.md`
  - add a top-level checklist item linking to this plan

## 17. Risks and Mitigations

### Risk: too much public discovery

Mitigation:

- signed-in only request creation
- exact slug lookup, not browse-all
- minimal metadata only
- optional future join code

### Risk: approval path bypasses derived resident access rules

Mitigation:

- approval must activate group membership first-class
- approval must call `ensureResidentNeighborhoodMembership`
- resident reads must continue relying on active group membership

### Risk: stale pending queue

Mitigation:

- lazy expiry
- requester cancel action
- clear history states

### Risk: duplicate business logic with invites

Mitigation:

- mirror invite patterns deliberately
- extract shared membership-upsert helper if duplication grows

### Risk: docs drift from actual code

Mitigation:

- keep the detailed plan in this file
- update the core docs only when implementation work starts or lands
- include doc updates as explicit acceptance criteria in the implementation
  phases

## 18. Recommended Delivery Order

1. Approve the product decisions in this document.
2. Add schema and migration.
3. Build service and router.
4. Build requester UI.
5. Build manager review UI.
6. Update docs and QA coverage.
7. Add end-to-end tests and run lint/build/test.

This order keeps the access-control core in place before any user-facing review
UI is added.
