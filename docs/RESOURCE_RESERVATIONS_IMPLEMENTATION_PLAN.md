# Neighborhood Resource Reservations Implementation Plan

## Purpose
This plan translates the proposed neighborhood resource reservations feature into an execution sequence for VecinoHub. It is intended to be implementation-ready for engineering, review, QA, and release planning.

This plan is based on:
- `docs/NEIGHBORHOOD_RESOURCE_RESERVATIONS_PROPOSAL.md`
- the current architectural rules in `docs/RULES.md` and `docs/ARCHITECTURE.md`
- the current product and access model in `docs/PRD.md`, `docs/PERMISSIONS.md`, and `docs/SCREENS.md`

Because the resource reservations module is not yet part of the canonical product contract, this plan begins with a documentation-alignment milestone before schema and implementation work.

## Scope Summary

### In Scope for MVP
- Neighborhood-scoped resource catalog.
- Admin create, edit, activate, and deactivate resource records.
- Weekly availability windows per resource.
- Resource rules for advance notice, duration, quota, and buffer policies.
- Group-scoped reservations.
- Availability calendar for residents and admins.
- Conflict prevention for exclusive resources.
- Resident reservation creation and cancellation.
- Admin-created blackout blocks.
- Resident reservation history for the selected group.
- SSR-first reads and tRPC-only mutations.

### Explicitly Out of Scope for MVP
- Manual approval workflow.
- Waitlists.
- Guest lists and invitation tracking.
- File uploads for deposit evidence.
- Automatic deposit charging or payment-provider integrations.
- Automatic fund-ledger integration for deposits or fees.
- Automatic no-show penalties.
- Check-in / check-out.
- Multi-capacity concurrent booking UI beyond the schema-level forward-compatibility field.

### Planned Phase 2 Follow-ups
- Manual approval and moderation queue.
- Optional deposit evidence or fee proof.
- `require_no_debt` validation against the `funds` module.
- Notifications and reminders.
- Basic reporting and usage analytics.

## Implementation Principles
- Preserve the repo’s SSR-first read model.
- Route all writes through tRPC.
- Keep all validation, business logic, scheduling logic, and permission enforcement in `src/services/resources.ts`.
- Keep resident access derived from active `group_membership` in the neighborhood; do not introduce independent access via the resource module.
- Treat `group` as the reservation owner and quota anchor.
- Treat `user` as the audit actor.
- Keep resources neighborhood-scoped like `events`, `posts`, and `funds`.
- Keep the initial implementation additive and safe for existing installations.
- Avoid embedding scheduling logic in React components; UI should consume normalized service responses.

## Delivery Strategy
Implement the feature in vertical milestones that reduce rework and keep dependencies explicit:

1. Lock product decisions and update canonical docs.
2. Add foundational schema, timezone support, and service primitives.
3. Deliver admin setup and management flows.
4. Deliver resident browsing, calendar, reservation, and cancellation flows.
5. Harden QA, seeds, and release readiness.

This order matters because the resource module combines product rules, scheduling constraints, and cross-scope permissions. Schema shape and timezone decisions must be stable before service and UI work begins.

## Workstreams
- Canonical documentation updates
- Data model and migration
- Timezone and scheduling primitives
- Service layer and guards
- tRPC router
- Admin SSR pages and forms
- Resident SSR pages and forms
- Shared calendar and availability UI
- Navigation and discoverability
- Seed/demo data
- QA, tests, and release documentation

## Milestone 0: Product Contract and Documentation Alignment
Goal: make the resource reservations module part of the project contract before implementation starts.

### 0.1 Canonical docs to update
Update the following docs to include the approved MVP contract:
- `docs/PRD.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/PERMISSIONS.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/IMPLEMENTATION_PLAN.md`

Recommended additional updates:
- `docs/SEEDING.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

### 0.2 Contract decisions to lock
Before schema work, explicitly lock:
- resource reservations are neighborhood-scoped
- reservation ownership and quota are group-scoped
- any active group member may create a reservation for their active group in MVP
- resident cancellation rules apply to the owning group’s reservation
- resource names are unique within a neighborhood
- weekly availability windows are stored as rows, not freeform text
- admin blocks are independent records, not re-used event rows
- pending approval is deferred out of MVP
- neighborhood timezone support is required before reservation cutoff logic ships

### 0.3 Documentation content requirements
The canonical docs should define:
- the new resource domain and its product purpose
- the precise route map for admin and resident pages
- the permission model for reads and writes
- the API surface and mutation responsibilities
- the data model with enums, tables, constraints, and indexing notes
- the QA scenarios and test id requirements

### 0.4 Deliverables
- approved proposal
- approved implementation plan
- canonical docs updated to reflect the approved MVP contract

### 0.5 Exit criteria
- No open product ambiguity remains that would change schema shape.
- No open access-control ambiguity remains that would affect services or routes.
- The team agrees on whether timezone support lands as part of this milestone or as a strict precondition for Milestone 1.

## Milestone 1: Foundational Data Model and Timezone Support
Goal: introduce the resource domain in Drizzle and make scheduling behavior safe for a multi-neighborhood app.

### 1.1 Schema prerequisite: neighborhood timezone
The proposal correctly identifies timezone handling as a core dependency. Resource scheduling should not ship without a neighborhood-local timezone source of truth.

Recommended implementation:
- add `time_zone` to `neighborhoods`
- use an IANA timezone string such as `America/Mexico_City`
- backfill existing neighborhoods with a safe default agreed by product
- validate timezone values in services

### 1.2 New enums
Add to `src/db/schema.ts`:
- `resource_status`: `active`, `inactive`
- `resource_reservation_status`: `approved`, `cancelled`, `completed`, `expired`
- `resource_block_reason`: `maintenance`, `cleaning`, `repair`, `neighborhood_event`, `unavailable`, `other`

Notes:
- `pending` and `rejected` should be deferred unless the team chooses to keep manual approval fields in schema ahead of UI delivery
- if the team wants schema forward-compatibility for Phase 2, add those enum values now, but be explicit that they are dormant in MVP

### 1.3 New tables
Add to `src/db/schema.ts`:
- `resources`
- `resource_availability_windows`
- `resource_rules`
- `resource_reservations`
- `resource_blocks`

### 1.4 Required columns and constraints

#### `resources`
- foreign key to `neighborhoods`
- case-insensitive unique name within neighborhood
- audit fields `created_by`, `created_at`, `updated_at`
- booleans for `requires_approval` and `requires_deposit`
- optional money fields for deposit and reservation fee
- `status`

#### `resource_availability_windows`
- foreign key to `resources`
- day-of-week integer
- `start_minute` and `end_minute`
- support multiple rows per day

#### `resource_rules`
- unique `resource_id`
- numeric rules for advance windows, duration, buffers, and quotas
- boolean flags for later-phase behaviors such as `require_no_debt`
- nullable cancellation cutoff
- `max_concurrent_reservations` defaulting to `1`

#### `resource_reservations`
- foreign keys to `resources`, `neighborhoods`, `groups`, and `users`
- `start_at` and `end_at`
- `status`
- reservation metadata: title, notes, attendee count
- audit fields for cancellation and completion

#### `resource_blocks`
- foreign keys to `resources`, `neighborhoods`, and `users`
- `start_at` and `end_at`
- reason enum and optional reason text

### 1.5 Indexing requirements
- `resources(neighborhood_id)`
- unique case-insensitive index for `(neighborhood_id, lower(name))`
- `resource_availability_windows(resource_id, day_of_week)`
- `resource_reservations(resource_id, start_at)`
- `resource_reservations(group_id, start_at)`
- `resource_reservations(neighborhood_id, status)`
- `resource_blocks(resource_id, start_at)`

### 1.6 Migration generation and review
- run `npm run db:generate`
- review generated SQL carefully
- run `npm run db:migrate` on a clean local database
- confirm no unrelated domain behavior is altered

### 1.7 Migration policy
- keep migrations additive
- do not create default resources automatically
- if timezone is added to neighborhoods, use a safe backfill approach and document it
- avoid schema fields whose MVP behavior is undefined

### 1.8 Acceptance criteria
- schema compiles cleanly
- migration applies on a blank database
- migration applies on an existing database with neighborhoods, groups, funds, polls, posts, and events
- all new tables and enums are documented in `docs/DATA_MODEL.md`
- timezone behavior is documented and no scheduling code depends on server local time

## Milestone 2: Service Foundation and Scheduling Rules
Goal: centralize all reservation logic in the service layer before UI work begins.

### 2.1 New module
Create `src/services/resources.ts`.

### 2.2 Internal helper responsibilities
Add internal helpers such as:
- `requireResourceAccess`
- `requireResourceAdminScope`
- `requireResourceGroupMemberScope`
- `getResourceRecord`
- `getResourceRules`
- `getNeighborhoodTimezone`
- `assertResourceNeighborhoodConsistency`
- `assertResourceGroupConsistency`
- `normalizeReservationWindow`
- `listConflictingReservations`
- `listConflictingBlocks`
- `computeResourceQuotaUsage`
- `validateReservationAgainstAvailability`
- `validateReservationAgainstRules`
- `validateReservationAgainstQuota`
- `buildCalendarAvailability`

### 2.3 Validation schemas
Add Zod schemas in the service layer for:
- resource create
- resource update
- resource status change
- availability window upsert
- resource rules upsert
- reservation create
- reservation cancel
- block create
- block update
- filters and pagination inputs
- calendar range inputs

### 2.4 Core invariants
The service layer must enforce:
- a resource belongs to exactly one neighborhood
- a reservation’s `group_id` belongs to the same neighborhood as the resource
- the actor has active membership in the target group
- the actor has active resident access to the target neighborhood
- the resource is active
- reservation start is before reservation end
- reservation duration is within min/max range
- reservation falls within a valid weekly availability window
- reservation respects min/max advance rules in the neighborhood timezone
- reservation does not conflict with blocks or reservations after considering buffers
- group-level monthly, yearly, and active-future quotas are not exceeded

### 2.5 Scheduling implementation rules
- store timestamps in UTC
- interpret day-of-week, minute-of-day windows, and cutoff rules in the neighborhood timezone
- do not rely on the app host timezone
- keep the scheduling utility logic deterministic and testable

Recommended implementation detail:
- isolate timezone conversion and interval math in private service helpers
- use `date-fns` and timezone-aware helpers consistently rather than mixing native `Date` logic with ad hoc math

### 2.6 Reservation status rules for MVP
Recommended MVP lifecycle:
- create as `approved`
- future reservation may become `cancelled`
- past reservation may become `completed` via service-side projection or explicit status update
- optionally mark stale future reservations as `expired` only if a real business rule requires it

Recommendation:
- avoid background jobs in MVP
- keep `completed` and `expired` as service-meaningful states only if the UI genuinely needs them

### 2.7 Acceptance criteria
- permission failures throw `ServiceError`
- invalid booking windows are rejected in services, not UI
- cross-neighborhood mismatches are rejected in services
- conflict detection correctly handles buffer-before and buffer-after rules
- quota counting is consistent for monthly, yearly, and active-future checks

## Milestone 3: Admin Resource Setup and Configuration
Goal: let admins configure resources completely before resident reservation flows go live.

### 3.1 Admin service methods
Implement:
- `listNeighborhoodResources`
- `getResourceAdminDetail`
- `createResource`
- `updateResource`
- `setResourceStatus`
- `replaceResourceAvailabilityWindows`
- `upsertResourceRules`

### 3.2 Admin overview shape
`getResourceAdminDetail` should provide:
- resource metadata
- active/inactive status
- availability windows
- rule summary
- upcoming reservation counts
- next blocked slot summary
- utilization summary placeholders for future reporting

### 3.3 Admin SSR routes
Build:
- `/admin/[neighborhoodId]/resources`
- `/admin/[neighborhoodId]/resources/new`
- `/admin/[neighborhoodId]/resources/[resourceId]`
- `/admin/[neighborhoodId]/resources/[resourceId]/edit`

### 3.4 Form architecture
- use server-rendered pages for read-heavy admin views
- use client components only for interactive forms
- use React Hook Form for create and edit flows
- keep mutations in the `resources` tRPC router

### 3.5 Admin UI requirements
- list or cards for resources in a neighborhood
- status badge per resource
- summary of key rules on list rows
- empty state with create CTA
- guided form sections:
  - basic info
  - weekly availability
  - booking limits
  - cancellation rules
  - financial settings
  - visible policy text
- preset helper UI for common rule profiles

### 3.6 Test id requirements
Add test ids for:
- resource rows
- create CTA
- status toggles
- edit form sections
- availability window editor
- rules form submit actions

### 3.7 Acceptance criteria
- neighborhood admin can create resources only in authorized neighborhoods
- platform admin can do the same across neighborhoods
- duplicate names in the same neighborhood are rejected
- inactive resources stop accepting new reservations
- availability windows and rules persist correctly and re-render on reload

## Milestone 4: Admin Blocks and Calendar Management
Goal: give admins operational control over calendar availability.

### 4.1 Admin service methods
Implement:
- `listResourceBlocks`
- `createResourceBlock`
- `updateResourceBlock`
- `removeResourceBlock`
- `getResourceCalendar`

### 4.2 Block rules
- blocks must belong to the same neighborhood as the target resource
- block start must be before block end
- blocks may overlap each other if product accepts operational redundancy, but the UI should discourage duplicates
- blocks must immediately make affected slots unavailable

### 4.3 Calendar data contract
`getResourceCalendar` should return normalized segments or rows that can render:
- available windows
- reserved windows
- blocked windows
- past reservations, if included

Because manual approval is out of MVP, calendar states should avoid pending-specific UI in the first release.

### 4.4 Admin SSR routes and UX
Add or extend:
- `/admin/[neighborhoodId]/resources/[resourceId]`
- `/admin/[neighborhoodId]/resources/blocks`

UI expectations:
- day and week views at minimum
- month view optional if implementation cost is acceptable
- quick-create block flow
- clear labeling for maintenance, cleaning, repair, event, and unavailable reasons

### 4.5 Acceptance criteria
- creating a block immediately affects availability
- removing a block reopens the time slot if no reservation conflict remains
- admin cannot manage blocks for foreign neighborhoods
- calendar rendering uses service output, not client-side recomputation of scheduling rules

## Milestone 5: Resident Catalog, Detail, and Availability
Goal: expose resources to active residents in authorized neighborhoods.

### 5.1 Resident service methods
Implement:
- `listResourcesForGroup`
- `getResourceDetailForGroup`
- `getGroupResourceCalendar`
- `listGroupReservations`

### 5.2 Resident route model
Build:
- `/dashboard/[groupId]/resources`
- `/dashboard/[groupId]/resources/[resourceId]`
- `/dashboard/[groupId]/resources/reservations`

### 5.3 Resident data rules
- only active group members can view resident resource pages for that group
- resources must be filtered to the group’s neighborhood
- inactive resources may still appear in history contexts if necessary, but must be visually unavailable
- resident detail should expose visible rule text and normalized rule values

### 5.4 Resident UI requirements
Resource catalog should show:
- name
- short description
- location
- capacity
- current status
- next available summary when feasible

Resource detail should show:
- full description
- usage rules
- weekly booking schedule
- duration and advance limits
- quota limits
- cancellation policy
- availability calendar
- reserve CTA

Group reservation history should show:
- upcoming reservations
- past reservations
- cancelled reservations
- resource name
- date and time
- status

### 5.5 Acceptance criteria
- resident only sees resources for the selected group’s neighborhood
- resident cannot access a resource page outside their group neighborhood
- resident sees the real availability calendar for the selected resource
- resident sees all booking rules before attempting reservation

## Milestone 6: Resident Reservation Creation and Cancellation
Goal: let active residents reserve resources while fully enforcing business rules.

### 6.1 Resident mutation methods
Implement:
- `createResourceReservation`
- `cancelResourceReservation`

### 6.2 Reservation creation flow
Reservation create should:
1. validate actor authentication
2. validate actor active membership in the selected group
3. validate group/resource/neighborhood consistency
4. validate resource status
5. normalize requested timestamps in the neighborhood timezone
6. validate against weekly availability
7. validate against min/max advance
8. validate against min/max duration
9. validate against quota rules
10. validate against blocks and conflicting reservations
11. insert the reservation inside a transaction

### 6.3 Cancellation flow
Cancellation should:
1. validate that the actor can cancel for the owning group
2. validate that the reservation is still cancellable
3. validate the cancellation cutoff, if configured
4. update reservation status and cancellation audit fields
5. ensure the slot is released immediately
6. ensure quota counting reflects the configured late-cancellation policy

### 6.4 Ownership and authorization policy
Recommended MVP rule:
- any active member of the owning group may cancel that group’s future reservation

Alternative:
- only the reservation creator, group admins, neighborhood admins, and platform admins may cancel

This decision should be locked in Milestone 0 and then encoded in services and docs.

### 6.5 Resident reservation form
Build:
- `/dashboard/[groupId]/resources/[resourceId]/reserve`

Form fields:
- date
- start time
- end time or duration
- title / event reason
- attendee count
- notes

### 6.6 UX requirements
- prevent impossible choices in the UI when possible
- still revalidate everything server-side
- display clear rejection messages for:
  - advance rule failure
  - duration rule failure
  - quota exceeded
  - resource inactive
  - slot conflict
  - late cancellation not allowed

### 6.7 Acceptance criteria
- reservation succeeds only when all service rules pass
- conflicting reservation requests are rejected
- quota violations are rejected
- valid cancellation updates history and frees the slot
- resident cannot reserve or cancel for a group where they are not an active member

## Milestone 7: Router, Navigation, and Shared UI Integration
Goal: integrate the module into the existing application shell cleanly.

### 7.1 tRPC router
Add `src/server/trpc/routers/resources.ts`.

Router responsibilities:
- expose mutations only
- optionally expose interactive read endpoints if the UI needs client-driven calendar refreshes
- use `getServiceContext` and `handleServiceError`
- keep business logic out of router bodies

### 7.2 Root router integration
- register the `resources` router in the app router composition
- keep naming aligned with existing domain routers

### 7.3 App navigation
Update navigation surfaces so the module is discoverable:
- resident app nav for `/dashboard/[groupId]`
- admin app nav for `/admin/[neighborhoodId]`
- empty states or overview cards where appropriate

### 7.4 Translations
Update:
- `src/messages/es.json`
- `src/messages/en.json`

Add labels for:
- resources
- reservations
- blocks
- availability
- cancellation rules
- booking limits
- statuses
- calendar actions
- validation messages

### 7.5 Shared component opportunities
Potential new shared components:
- `ResourceStatusBadge`
- `ResourceRuleSummary`
- `ReservationStatusBadge`
- `AvailabilityCalendar`
- `ResourceEmptyState`

### 7.6 Acceptance criteria
- module is reachable from both resident and admin shells
- translations are present in supported languages
- all new actions and tables include test ids

## Milestone 8: Seed Data, QA, and Verification
Goal: make the feature testable, demoable, and releasable.

### 8.1 Seed data
Update seed flows to optionally create:
- one or more sample resources per neighborhood
- realistic weekly availability windows
- at least one active and one inactive resource
- sample future reservations
- sample blocks

Update:
- `docs/SEEDING.md`

### 8.2 QA documentation
Update:
- `docs/QA.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

Add manual QA coverage for:
- admin create/edit/deactivate resource
- weekly availability editing
- block creation/update/removal
- resident browse/detail/reserve/cancel
- quota enforcement
- conflict enforcement
- cross-neighborhood access denial
- translation and responsive checks

### 8.3 Suggested automated coverage
If tests are added, prioritize:
- service-level rule validation
- service-level conflict detection
- permission checks
- timezone normalization behavior
- resident reservation creation and cancellation flows

### 8.4 Lint and build gates
Before merge:
- run `npm run lint`
- run `npm run build`
- run `npm run db:migrate` on a clean database

### 8.5 Acceptance criteria
- seed data creates a credible demo path
- manual QA scenarios are documented and executed
- build and lint pass
- documentation accurately reflects the delivered scope

## Milestone 9: Release Readiness and Follow-up Work
Goal: ship a stable MVP and leave Phase 2 work clearly staged.

### 9.1 Release checklist
- confirm no routes expose foreign-neighborhood data
- confirm inactive resources cannot be booked
- confirm late-cancellation behavior matches documented rules
- confirm calendar availability matches service conflict logic
- confirm all docs are updated to canonical state

### 9.2 Deferred backlog handoff
Track explicitly for later milestones:
- manual approval
- deposit evidence and fee workflows
- `require_no_debt` integration with `funds`
- notification delivery
- usage reporting
- concurrent-capacity UI
- waitlists
- check-in / check-out

## Documentation Checklist
The following documentation updates are part of this plan and should not be treated as optional cleanup:
- `docs/PRD.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/PERMISSIONS.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/SEEDING.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

## Recommended Execution Order
1. Update canonical docs and lock scope.
2. Add neighborhood timezone support if it does not already exist.
3. Add schema and migrations for resources.
4. Build service-layer scheduling and validation primitives.
5. Add admin setup flows.
6. Add admin block/calendar flows.
7. Add resident catalog and detail flows.
8. Add resident reservation and cancellation flows.
9. Update seeds, QA docs, and release notes.

## Open Decisions to Resolve Before Coding
- Whether the MVP schema should include dormant approval fields and statuses now or only add them in Phase 2.
- Whether any active group member may cancel a group reservation or whether cancellation should be narrower.
- Whether month and year quota counts should use reservation start date only or any overlap with the period.
- Whether visitor parking in MVP is modeled as separate resources or as one resource with capacity.
- What default timezone to use for existing seeded neighborhoods during backfill.
