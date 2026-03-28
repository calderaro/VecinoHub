# Neighborhood Resource Reservations Proposal

## Status
- Proposed feature design.
- This document is intentionally not yet a source of truth.
- If approved, the next step is to update `docs/PRD.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/PERMISSIONS.md`, `docs/SCREENS.md`, `docs/QA.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Problem
VecinoHub already covers neighborhood communication, events, polls, fundraising, fund management, and group membership, but it does not offer a structured way to reserve shared neighborhood resources.

Current gaps:
- Admins must coordinate amenity usage manually through chat, spreadsheets, or informal approval.
- Residents cannot see a trustworthy availability calendar before requesting a reservation.
- Reservation rules are hard to enforce consistently when they live outside the system.
- There is no audit trail for who reserved, approved, cancelled, or blocked a time slot.
- Neighborhoods cannot apply household-level limits without manual review.

## Product Goal
Add a neighborhood-scoped resource reservations module that lets admins configure reservable assets and lets residents reserve them under enforceable rules, shared calendars, and clear permissions.

The feature should support assets such as:
- grill / barbecue area
- event hall
- court
- terrace
- clubhouse
- pool by schedule
- meeting room
- visitor parking, when applicable

## Recommended Domain Boundary

### Use `resources` as the technical domain name
The internal domain should use `resources` and `resource reservations`.

Reasoning:
- it covers both classic amenities and less typical reservable assets such as visitor parking
- it matches current module naming in the repo (`events`, `posts`, `funds`, `polls`)
- the Spanish UI can still label the feature as `Amenidades` or `Recursos`

### Keep reservations separate from events
- `events` remain neighborhood-wide announcements or happenings
- `resource reservations` represent claimed time slots for a specific resource
- a neighborhood event may justify a manual resource block, but it should not be the same table or workflow

### Use `group` as the reserving entity
VecinoHub already models households as `groups`. Reservation limits should be enforced at the `group` level, not the individual user level.

Recommended rule:
- every reservation belongs to one `group`
- the action is still audited to the acting `user`
- limits such as monthly usage, yearly usage, and active future reservations are computed per `group`

This matches the rest of the app better than introducing a new `property` or `unit` entity.

### Keep financial flows lightweight in MVP
Resources may eventually require deposits or reservation fees, but this module should not become a second treasury system in its first release.

Recommended boundary:
- store fee and deposit requirements on the resource
- store reservation-side payment or proof status only if needed
- defer full ledger integration, automatic charges, and accounting reconciliation to a later phase

## Key Product Decisions

### 1. Reservation ownership is household-scoped
- reservation limits are enforced per `group`
- one resident cannot bypass limits by switching to another user account in the same household

### 2. Any active member of the group may reserve in MVP
- any active `group_member` or `group_admin` in the selected dashboard group may create a reservation for that group
- the acting user is stored for audit
- future versions may allow a stricter `group_admin`-only mode if neighborhoods request it

### 3. Weekly availability and blackout blocks are different concepts
- weekly availability defines when a resource can normally be booked
- blocks represent one-off exceptions such as maintenance, cleaning, repairs, or neighborhood events

### 4. Pending approval should hold the slot
If a resource requires manual approval:
- the reservation is created as `pending`
- the requested slot is treated as unavailable while pending
- admin can approve or reject it

This avoids overbooking during review.

### 5. Limits count at the group level, not the user level
- monthly and yearly counts apply to the reserving `group`
- active future reservation caps also apply to the reserving `group`
- cancellations may or may not consume quota depending on the configured cancellation policy

### 6. Time rules must use a neighborhood-local timezone
This feature depends on local calendar logic. Multi-neighborhood support makes timezone handling important.

Recommended requirement:
- add a canonical `time_zone` to `neighborhoods`
- interpret availability windows, advance rules, buffers, and cancellation cutoffs in that neighborhood timezone
- store reservation timestamps in UTC

If neighborhood timezone support is not introduced first, this feature will accumulate avoidable date and cutoff bugs.

### 7. Presets should be a UX helper, not a separate permission model
Admins should get simple presets such as:
- `flexible`
- `moderate`
- `strict`

These presets should only prefill rule fields. The persisted source of truth remains the explicit resource configuration.

## Core User Stories

### Resident
- As a resident, I can browse the resources available in my active neighborhood.
- As a resident, I can open a resource and see its description, rules, and availability calendar.
- As a resident, I can reserve a resource for my own group if the request fits the configured rules.
- As a resident, I can see my group's upcoming, past, and cancelled reservations.
- As a resident, I can cancel a future reservation when cancellation rules allow it.

### Neighborhood admin
- As a neighborhood admin, I can create and edit reservable resources for my neighborhood.
- As a neighborhood admin, I can configure availability windows, limits, approval rules, and cancellation rules per resource.
- As a neighborhood admin, I can block dates and hours for maintenance or operational reasons.
- As a neighborhood admin, I can review pending reservations for resources that require approval.
- As a neighborhood admin, I can inspect a calendar view that shows available, blocked, pending, and approved time slots.

## Proposed MVP Scope

### Included
- Neighborhood-scoped resource catalog.
- Admin create/edit/deactivate resource.
- Weekly availability windows per resource.
- Group-scoped reservations.
- Calendar-based availability view.
- Conflict prevention for exclusive resources.
- Core rules:
  - minimum advance
  - maximum advance
  - minimum duration
  - maximum duration
  - maximum reservations per month per group
  - maximum reservations per year per group
  - maximum active future reservations per group
  - buffer before and after reservations
- Resident reservation creation and cancellation.
- Admin manual blocks.
- Resident "my reservations" experience.
- SSR-first reads and tRPC-only mutations.

### Deferred to Phase 2
- Manual approval workflow.
- Deposit and reservation fee proof capture.
- Automatic "must be current on dues" validation against the `funds` module.
- Notifications and reminders.
- Reports and analytics.
- Resource-level usage exports.

### Deferred to Phase 3
- Waitlist support.
- Guest management.
- Digital agreement acknowledgement or signature.
- Check-in / check-out.
- Automatic penalties or no-show handling.
- Capacity-based concurrent booking beyond simple exclusive resources.

## Conceptual Model

### 1. Resource
A resource is the reservable thing itself.

Examples:
- Grill 1
- Event Hall
- Court A
- Visitor Parking Spot 3

Each resource owns:
- its neighborhood scope
- descriptive metadata
- visible usage rules
- activation state
- reservation policy settings

### 2. Availability windows
Availability windows define the normal weekly booking schedule.

Examples:
- Monday to Thursday, 10:00 to 21:00
- Friday to Sunday, 10:00 to 22:00

This should be modeled as explicit rows, not a single serialized text field, so the service layer can validate reservations accurately.

### 3. Reservation rules
Rules define how a reservation request is evaluated.

Examples:
- minimum 24 hours in advance
- maximum 14 days in advance
- maximum 2 reservations per month per group
- maximum duration 6 hours
- 60-minute cleanup buffer after each reservation

### 4. Reservation
A reservation is a time-bound claim against a resource for one `group`.

The reservation stores:
- the resource
- the reserving group
- the acting user who created it
- the requested time range
- workflow status
- audit fields for approval, rejection, and cancellation

### 5. Block
A block is an admin-created blackout period that prevents reservations.

Examples:
- maintenance
- cleaning
- repair
- neighborhood event
- unavailable day

### 6. Calendar projection
The calendar is a read model produced by services from:
- weekly availability windows
- admin blocks
- reservations
- resource rules

The service should return a normalized availability response rather than pushing scheduling logic into the UI.

## Proposed Data Model

### New enums
- `resource_status`: `active`, `inactive`
- `resource_reservation_status`: `pending`, `approved`, `rejected`, `cancelled`, `completed`, `expired`
- `resource_block_reason`: `maintenance`, `cleaning`, `repair`, `neighborhood_event`, `unavailable`, `other`

### New tables

#### `resources`
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `name`
- `description` (nullable)
- `type` (nullable text, user-defined category)
- `location` (nullable)
- `capacity` (nullable)
- `status`
- `requires_approval`
- `requires_deposit`
- `deposit_amount` (nullable)
- `reservation_fee_amount` (nullable)
- `usage_rules` (nullable text)
- `terms_text` (nullable text)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

Notes:
- use text for `type` in MVP instead of a rigid enum so neighborhoods can add categories without schema churn
- enforce case-insensitive unique name per neighborhood

#### `resource_availability_windows`
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `day_of_week` (integer, 0-6 or 1-7; choose one convention and keep it consistent)
- `start_minute`
- `end_minute`
- `created_at`
- `updated_at`

Notes:
- multiple rows per day are allowed for split schedules
- storing minutes-from-midnight keeps validation simple and avoids time-type edge cases in Drizzle

#### `resource_rules`
- `id` (pk)
- `resource_id` (fk -> resources.id, unique)
- `min_advance_hours`
- `max_advance_days`
- `max_reservations_per_month` (nullable)
- `max_reservations_per_year` (nullable)
- `max_active_reservations` (nullable)
- `min_duration_minutes`
- `max_duration_minutes`
- `buffer_before_minutes`
- `buffer_after_minutes`
- `max_concurrent_reservations`
- `require_no_debt`
- `cancellation_limit_hours` (nullable)
- `late_cancellation_counts_as_usage`
- `late_cancellation_forfeits_deposit`
- `created_at`
- `updated_at`

Notes:
- `max_concurrent_reservations` should default to `1`
- even if the initial UI only supports exclusive resources, the integer limit keeps the data model forward-compatible
- one rules row per resource is sufficient in MVP

#### `resource_reservations`
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `group_id` (fk -> groups.id)
- `requested_by` (fk -> users.id)
- `start_at`
- `end_at`
- `title`
- `notes` (nullable)
- `attendee_count` (nullable)
- `status`
- `reviewed_by` (fk -> users.id, nullable)
- `reviewed_at` (nullable)
- `approved_at` (nullable)
- `rejected_at` (nullable)
- `rejection_reason` (nullable)
- `cancelled_by` (fk -> users.id, nullable)
- `cancelled_at` (nullable)
- `cancellation_reason` (nullable)
- `completed_at` (nullable)
- `deposit_status` (nullable text for later phases)
- `deposit_reference` (nullable)
- `created_at`
- `updated_at`

Notes:
- `group_id` is the reservation owner for quota and permission checks
- `requested_by` preserves person-level auditability
- if approval is disabled, reservations are created directly as `approved`
- if approval is enabled, reservations are created as `pending`

#### `resource_blocks`
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `start_at`
- `end_at`
- `reason`
- `reason_text` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

Notes:
- keep blocks independent from `events` in MVP
- a future version may add optional `source_type` / `source_id` if neighborhoods want blocks generated from other modules

## Key Constraints and Indexing Notes
- Unique resource name per neighborhood using the same case-insensitive strategy already used elsewhere in the repo.
- One rules row per resource.
- Index `resources(neighborhood_id)`.
- Index `resource_availability_windows(resource_id, day_of_week)`.
- Index `resource_reservations(resource_id, start_at)`.
- Index `resource_reservations(group_id, start_at)`.
- Index `resource_reservations(neighborhood_id, status)`.
- Index `resource_blocks(resource_id, start_at)`.
- Service-layer validation must enforce neighborhood consistency across `resource`, `group`, `reservation`, and `block`.

Recommended implementation detail:
- do conflict detection in the service layer inside a transaction
- do not rely on a simple unique constraint for overlap protection because the rules depend on buffers, status handling, and possible future concurrent capacity

## Core Business Rules

### Resource eligibility
Before creating a reservation, the service should validate:
- the resource exists
- the resource belongs to the same neighborhood as the selected group
- the resource is `active`
- the actor is an active member of the selected group
- the actor has resident access to the resource's neighborhood

### Time-window validation
The requested reservation must:
- start before end
- fit entirely within an allowed weekly availability window for that day
- respect minimum and maximum duration
- respect minimum and maximum advance rules
- respect buffer rules relative to conflicting reservations and blocks

### Conflict validation
The requested time range must not conflict with:
- overlapping `approved` reservations
- overlapping `pending` reservations that still hold the slot
- overlapping admin blocks

For exclusive resources:
- overlap count must stay below `max_concurrent_reservations`

### Group-level quota validation
The reserving `group` must not exceed:
- monthly reservation count
- yearly reservation count
- active future reservation count

Recommended counting behavior:
- `approved` and `pending` future reservations count toward active future limits
- completed reservations count toward monthly or yearly usage totals
- cancelled reservations count only when cancellation policy says they should
- rejected and expired reservations do not count

### Cancellation policy
The policy should support:
- a configurable resident cancellation cutoff
- immediate slot release after valid cancellation
- optional quota consumption for late cancellation
- optional deposit forfeiture in later phases

Recommended rule:
- on-time cancellation releases the slot and does not consume quota
- late cancellation may still consume quota if the resource is configured that way

### Funds integration
If `require_no_debt` is enabled in a later phase, the service should validate the reserving `group` against the neighborhood fund domain.

Recommended definition:
- the group must not have overdue `fund_group_charges` in the same neighborhood

This should be treated as a cross-module service rule, not a UI-only warning.

## Permissions

### Platform admin
- full CRUD across resources, blocks, and reservations in all neighborhoods
- may review, approve, reject, cancel, or override any reservation

### Neighborhood admin
- full CRUD across resources, blocks, and reservations in authorized neighborhoods only
- may review pending reservations and manage calendar availability

### Group admin
- same resident read access as other active group members
- no admin-level control over resource configuration outside their resident reservation actions

### Neighbor
- may list and view resources in neighborhoods where they have active resident access
- may create reservations only for groups where they hold active membership
- may view their own group's reservations
- may cancel their own group's future reservations when policy allows
- may not configure resources, manage blocks, or review pending reservations

## Proposed Service and API Surface

### New service module
- `src/services/resources.ts`

### Read methods for SSR pages
- `listResources`
- `getResourceDetail`
- `getResourceCalendar`
- `listGroupReservations`
- `listNeighborhoodReservationQueue`
- `listResourceBlocks`
- `getResourceAdminOverview`

### Mutations through tRPC
- `resources.create`
- `resources.update`
- `resources.setStatus`
- `resources.updateAvailabilityWindows`
- `resources.updateRules`
- `resources.createReservation`
- `resources.cancelReservation`
- `resources.reviewReservation`
- `resources.createBlock`
- `resources.updateBlock`
- `resources.removeBlock`

### tRPC contract notes
- all writes go through a `resources` router
- SSR pages should read from services directly when possible
- if calendar navigation needs client interactivity, React Query may call a read endpoint, but the business logic must still live in services
- routers should use `getServiceContext` and `handleServiceError`, consistent with the rest of the repo

## Proposed Screens and Routes

### Resident
- `/dashboard/[groupId]/resources`
  - resource catalog
  - quick status cards
  - links to detail and reservation history
- `/dashboard/[groupId]/resources/[resourceId]`
  - resource detail
  - rules
  - availability calendar
  - create reservation CTA
- `/dashboard/[groupId]/resources/[resourceId]/reserve`
  - reservation form
- `/dashboard/[groupId]/resources/reservations`
  - the selected group's upcoming, past, and cancelled reservations

### Neighborhood admin
- `/admin/[neighborhoodId]/resources`
  - resource list
  - availability summary
  - active rule summary
  - create resource CTA
- `/admin/[neighborhoodId]/resources/new`
- `/admin/[neighborhoodId]/resources/[resourceId]`
  - admin overview
  - upcoming reservations
  - calendar
  - blocks
  - rules summary
- `/admin/[neighborhoodId]/resources/[resourceId]/edit`
- `/admin/[neighborhoodId]/resources/reservations`
  - pending, approved, rejected, cancelled filters
- `/admin/[neighborhoodId]/resources/blocks`
  - manual block management

Recommended UI requirement:
- every new or updated screen must include test ids, consistent with the rest of the app

## UX Notes

### Admin resource setup should feel guided
The admin form should separate:
- basic info
- availability
- reservation limits
- financial rules
- visible policy text

### Presets should reduce admin effort
Examples:

#### Grill preset
- minimum advance: 24 hours
- maximum advance: 14 days
- maximum reservations per month per group: 2
- maximum duration: 6 hours
- no manual approval

#### Event hall preset
- minimum advance: 72 hours
- maximum advance: 60 days
- maximum active reservations: 1
- maximum duration: 8 hours
- manual approval required
- deposit required

### Resident rules must be visible before submission
Every resource detail page should clearly show:
- allowed booking schedule
- duration limits
- monthly and yearly household limits
- approval requirement
- fee or deposit requirement
- cancellation policy

## Delivery Recommendation

### Phase 1
- resource catalog
- weekly availability
- basic resource rules
- reservations
- conflict prevention
- resident reservation history
- admin blocks

### Phase 2
- manual approval
- deposits and fee proof
- dues eligibility validation through `funds`
- notifications
- usage reporting

### Phase 3
- waitlist
- guests
- signatures
- check-in / check-out
- penalties and no-show handling

## Implementation Notes for VecinoHub
- Keep the module neighborhood-scoped like `events`, `posts`, and `funds`.
- Keep all business rules in `src/services/resources.ts`.
- Use SSR-first reads for catalog, detail, and calendar pages.
- Use tRPC only for mutations and interactive form actions.
- Reuse existing neighborhood and group guard patterns from `src/services/guards.ts`.
- Keep reservation access derived from active `group_membership` in the same neighborhood.
- Treat `group` as the quota and ownership anchor; treat `user` as the audit actor.

## Open Follow-ups
- Whether resident cancellation should be allowed for any active member of the owning group or only the reservation creator plus group admins.
- Whether visitor parking should be modeled as one resource per spot in MVP or as a shared resource with concurrent capacity.
- Whether deposits should remain local to this module or eventually post into the `funds` ledger.
- Whether pending reservations should expire automatically after a fixed review window once manual approval is introduced.
