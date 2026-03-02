# VecinoHub Multi-Neighborhood Implementation Plan

This document defines a detailed execution plan to evolve VecinoHub from a single-neighborhood deployment to a multi-neighborhood platform with three effective access levels:

1. `platform_admin` (global control across all neighborhoods)
2. `neighborhood_admin` (admin control limited to one neighborhood)
3. `neighbor` (resident dashboard and participation)

This plan follows the existing project constraints in `docs/RULES.md` and `docs/ARCHITECTURE.md`:
- SSR-first reads from services
- tRPC for all mutations
- business logic and validation in `src/services`
- no direct DB access from pages/routers

## 1) Goals

- Support multiple neighborhoods in a single VecinoHub instance.
- Introduce explicit platform-level administration.
- Restrict neighborhood admins to their own neighborhood scope.
- Preserve existing resident workflows (groups, polls, fundraising, events, posts) with strict tenant isolation.
- Execute migration without data loss from current single-neighborhood production data.

## 2) Non-Goals (This Iteration)

- Cross-neighborhood analytics dashboards with BI/reporting exports.
- Per-feature custom role builders beyond the 3-level model.
- External tenant onboarding automation (billing, custom domain, provisioning APIs).
- Public multi-neighborhood marketplace/discovery pages.

## 3) Current State Summary (Baseline)

- System is single-tenant by schema and services.
- `users.role` is currently `user | admin`.
- No `neighborhoods` entity exists.
- Business entities are globally scoped:
  - `groups`, `polls`, `fundraising_campaigns`, `events`, `posts`
- Permission model supports:
  - global `admin`
  - per-group admin (`groups.admin_user_id`)
  - group membership checks
- Admin routes are global (`/admin/*`), not tenant-scoped.

## 4) Target Access Model

## 4.1 System-level role

- `users.role` becomes system role with values:
  - `user`
  - `platform_admin`

Notes:
- Most users remain `user`.
- Platform administrators are explicitly elevated and can manage neighborhoods and users globally.

## 4.2 Neighborhood-level role

Add a neighborhood membership table with role:
- `neighbor`
- `neighborhood_admin`

Neighborhood admins:
- can manage groups and membership inside their neighborhood
- can manage neighborhood-scoped polls, fundraising, events, posts
- cannot access or mutate data in other neighborhoods
- cannot promote users to `platform_admin`

## 4.3 Group-level admin compatibility

`groups.admin_user_id` can remain in MVP for backward compatibility and local delegation.

Policy:
- `platform_admin` can manage any group.
- `neighborhood_admin` can manage any group in their neighborhood.
- `group admin` (group owner) can manage only their own group.

Optional follow-up:
- remove group admin concept later if neighborhood admin should be the only manager.

## 5) Target Data Model Changes

All schema updates must be performed by editing `src/db/schema.ts`, then using:
- `npm run db:generate`
- `npm run db:migrate`

Do not hand-write migration files.

## 5.1 New enums

- `system_role`: `user`, `platform_admin`
- `neighborhood_status`: `active`, `inactive`
- `neighborhood_membership_status`: `active`, `inactive`
- `neighborhood_role`: `neighbor`, `neighborhood_admin`

## 5.2 New tables

### `neighborhoods`

Columns:
- `id` UUID PK
- `name` text not null
- `slug` text not null unique (case-insensitive unique index via `lower(slug)`)
- `status` enum default `active`
- `created_by` UUID FK -> users.id
- `created_at`, `updated_at`

Indexes:
- unique index on `lower(slug)`
- status index

### `neighborhood_memberships`

Columns:
- `id` UUID PK
- `neighborhood_id` UUID FK -> neighborhoods.id
- `user_id` UUID FK -> users.id
- `role` enum default `neighbor`
- `status` enum default `active`
- `created_at`, `updated_at`

Constraints:
- unique (`neighborhood_id`, `user_id`)

Indexes:
- `neighborhood_id`
- `user_id`
- composite (`neighborhood_id`, `role`)

## 5.3 Changes to existing tables

Add `neighborhood_id` (UUID FK -> neighborhoods.id) to:
- `groups`
- `polls`
- `fundraising_campaigns`
- `events`
- `posts`

Also:
- convert `users.role` enum values from `user/admin` to `user/platform_admin`
- preserve current `admin` users by mapping to `platform_admin` during migration

## 5.4 Tenant integrity constraints

Add service-layer guards and DB-level assumptions to prevent cross-tenant writes:
- group must belong to same neighborhood as acting admin membership
- vote `group_id` and `poll_id` must belong to same neighborhood (service validation)
- contribution `group_id` and `campaign_id` must belong to same neighborhood (service validation)
- event/post access restricted by neighborhood scope

Optional hardening follow-up:
- trigger-based cross-table tenant consistency checks

## 6) Migration Strategy (Zero-Data-Loss)

## 6.1 Phase A migration (expand schema safely)

1. Add new enums and new tables.
2. Add nullable `neighborhood_id` columns to target tables.
3. Create one default neighborhood record, example:
   - name: `VecinoHub Neighborhood`
   - slug: `vecinohub-neighborhood`
4. Backfill all existing rows in target tables with this default `neighborhood_id`.
5. Backfill `neighborhood_memberships` from existing group memberships:
   - for each unique `user_id` in groups of default neighborhood, create membership as `neighbor`
6. Add neighborhood admin memberships for existing admins:
   - current global admins can be inserted as `neighborhood_admin` in default neighborhood
7. Convert existing `users.role='admin'` to `platform_admin`.

## 6.2 Phase B migration (enforce constraints)

After app code is updated and deployed:
1. make all new `neighborhood_id` columns `NOT NULL`
2. add missing indexes
3. remove obsolete enum value `admin` from role enum if still present
4. verify row counts before/after with migration validation script

## 6.3 Rollback strategy

- Use DB backup/snapshot before Phase A migration.
- Keep compatibility code path for legacy role names during transition.
- Release in 2 deploys:
  - Deploy 1: schema expansion + backward-compatible code
  - Deploy 2: constraint enforcement + cleanup

## 7) Service Layer Refactor Plan

## 7.1 Service context extension

Update types in:
- `src/services/types.ts`
- `src/server/auth.ts`

Target session user payload:
- `id`
- `role` (`user | platform_admin`)
- `activeNeighborhoodId` (nullable, chosen context)
- existing fields (`username`, `image`, `preferredLanguage`)

`activeNeighborhoodId` can be stored in session metadata/cookie and switched from UI.

## 7.2 New guard functions

In `src/services/guards.ts` add:
- `requirePlatformAdmin(ctx)`
- `requireNeighborhoodMember(ctx, neighborhoodId)`
- `requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId)`
- `requireGroupAccess(ctx, groupId)` returning resolved `neighborhoodId`
- `requireGroupAdminNeighborhoodAdminOrPlatform(ctx, groupId)`

All guards must throw `ServiceError` with existing code semantics.

## 7.3 Refactor service modules

### `groups` service

- Scope create/list/update/delete by `neighborhood_id`.
- `createGroup` should require neighborhood admin or platform admin for that neighborhood.
- membership mutations (`addMember`, `removeMember`) must verify actor’s neighborhood role and group scope.
- list APIs must only return groups from active neighborhood unless platform admin explicitly requests all.

### `users` service

- split responsibilities:
  - global user management for platform admin
  - neighborhood member management for neighborhood admin
- add APIs to:
  - list neighborhood members
  - assign/revoke neighborhood admin role
  - invite/add user to neighborhood
- protect `updateUserRole` so only platform admin can assign `platform_admin`.

### `polls`, `fundraising`, `events`, `posts`

- add neighborhood scoping to all queries and mutations.
- enforce neighborhood consistency with referenced groups.
- ensure non-admin readers only see data from their neighborhoods.
- ensure admin stats are neighborhood-scoped unless platform admin global view is requested.

## 8) tRPC Contract Updates

Update routers in `src/server/trpc/routers/*` to align with new service contracts.

## 8.1 New/updated procedures

### `neighborhoods` router (new)
- `neighborhoods.list` (platform admin)
- `neighborhoods.create` (platform admin)
- `neighborhoods.update` (platform admin)
- `neighborhoods.activate` / `deactivate` (platform admin)
- `neighborhoods.setActiveContext` (authenticated user, for context switching)

### `users` router
- keep global user procedures for platform admin only
- add neighborhood membership role procedures for neighborhood admins

### Existing domain routers

Add neighborhood identifiers where needed, or derive from active context:
- `groups.*`
- `polls.*`
- `fundraising.*`
- `events.*`
- `posts.*`

Rule:
- avoid trusting arbitrary neighborhood IDs from client when context can be derived from `groupId` + guard checks.

## 9) Route and UI Structure Plan

## 9.1 Route strategy

Introduce two admin shells:
- Platform admin: `/platform/*`
- Neighborhood admin: `/admin/*` (scoped to active neighborhood)

Resident dashboard keeps current shape for compatibility:
- `/dashboard`
- `/dashboard/[groupId]/*`

Optional future route hardening:
- `/n/[neighborhoodSlug]/dashboard/[groupId]/*`

## 9.2 Layout guards

- `src/app/(admin)/layout.tsx` becomes neighborhood-admin or platform-admin aware.
- create dedicated platform layout guard for `/platform/*` requiring `platform_admin`.
- keep resident dashboard guards but enforce neighborhood membership through services.

## 9.3 Navigation and context switching

Update:
- `src/components/user-menu.tsx`
- `src/components/admin/admin-shell-chrome.tsx`

Features:
- neighborhood switcher for users with multiple neighborhood memberships
- platform admins can switch between:
  - global platform control
  - neighborhood context view

## 9.4 Admin UX split

Neighborhood admin pages remain domain-focused:
- groups, members, polls, fundraising, events, posts for one neighborhood.

Platform admin pages add global controls:
- neighborhoods list/create/edit
- assign neighborhood admins
- global user search and role management

## 10) Seed and Local Dev Data Plan

Update `scripts/seed.ts`:
- create at least 2 neighborhoods
- create:
  - one platform admin
  - neighborhood admin per neighborhood
  - residents in each neighborhood
- ensure data isolation:
  - groups, polls, campaigns, events, posts exist in both neighborhoods
  - no cross-neighborhood group memberships unless explicitly intended

Add deterministic sample accounts in docs:
- platform admin
- neighborhood admin A/B
- resident A/B

## 11) Detailed Execution Phases

## Phase 0: Alignment and design freeze

- [x] Approve final role semantics (`platform_admin`, `neighborhood_admin`, `neighbor`).
- [x] Approve route split (`/platform`, `/admin`, `/dashboard`).
- [x] Approve whether group admin remains in MVP.
- [x] Document decisions in `docs/PRD.md` and `docs/PERMISSIONS.md`.

## Phase 1: Schema expansion + compatibility

- [x] Update `src/db/schema.ts` with new enums, tables, and nullable `neighborhood_id` columns.
- [x] Generate migration with Drizzle.
- [x] Apply migration locally.
- [x] Backfill script in migration SQL for default neighborhood + data mapping.
- [x] Verify counts:
  - rows before/after in each table
  - no null neighborhood IDs in backfilled rows
  - role migration correctness (`admin -> platform_admin`)

## Phase 2: Auth/session/context foundation

- [x] Update Better Auth user additional field typing for new system role values.
- [x] Update `getSession` return type.
- [x] Add active neighborhood context load/store strategy.
- [x] Ensure tRPC service context includes tenant context.

## Phase 3: Guard and permission hardening

- [x] Implement new guard helpers in `src/services/guards.ts`.
- [x] Replace direct `ctx.user.role === "admin"` checks across services.
- [x] Add neighborhood scope checks for all group-referenced operations.
- [x] Add regression checks for forbidden cross-neighborhood access.

## Phase 4: Services tenant scoping

- [x] `groups.ts`: add neighborhood filters to all CRUD/list operations.
- [x] `users.ts`: split platform vs neighborhood user management.
- [x] `polls.ts`: ensure poll queries/mutations are neighborhood scoped.
- [x] `fundraising.ts`: scope campaigns, contributions, and participation metrics.
- [x] `events.ts`: scope events by neighborhood.
- [x] `posts.ts`: scope posts by neighborhood.

## Phase 5: tRPC router updates

- [x] Create `neighborhoods` router and register in app router.
- [x] Update inputs/outputs for changed procedures.
- [x] Keep routers thin and use service-level validation.
- [x] Update docs/API.md contract with exact procedure list and permissions.

## Phase 6: UI and route refactor

- [x] Build platform shell/routes (`/platform`).
- [x] Refactor neighborhood admin shell/routes (`/admin`) to use active neighborhood context.
- [x] Update user menu with neighborhood switcher + correct entry points.
- [x] Update dashboard fallback logic on `/dashboard`:
  - no neighborhood membership state
  - no group state per neighborhood
- [x] Ensure all updated/added UI has test IDs.

## Phase 7: Constraints enforcement and cleanup

- [x] Make `neighborhood_id` non-null in scoped tables.
- [x] Add final indexes and unique constraints.
- [x] Keep temporary compatibility code paths for legacy `admin` role during transition.
- [x] Verify no stale queries without neighborhood filter remain.

## Phase 8: Documentation and QA completion

- [x] Update:
  - `docs/PRD.md`
  - `docs/DATA_MODEL.md`
  - `docs/API.md`
  - `docs/PERMISSIONS.md`
  - `docs/SCREENS.md`
  - `docs/SEEDING.md`
  - `docs/QA.md`
  - `docs/PLAYWRIGHT_TEST_RUNS.md`
- [x] Add manual QA cases for cross-tenant isolation.

## 12) QA and Verification Matrix

## 12.1 Critical permission tests

- [x] Platform admin can create neighborhood.
- [x] Neighborhood admin cannot create neighborhood.
- [x] Neighborhood admin cannot view/edit another neighborhood’s data.
- [x] Resident cannot access `/admin/*` or `/platform/*`.
- [x] Group admin cannot manage groups outside assigned group.

## 12.2 Data isolation tests

- [x] Poll list only shows current neighborhood polls.
- [x] Fundraising campaign detail excludes foreign neighborhood contributions.
- [x] Events/posts lists are neighborhood-scoped.
- [x] Group membership operations reject cross-neighborhood group/user combinations.

## 12.3 Regression tests (existing features)

- [x] Vote flow still supports one vote per group per poll.
- [x] Contribution submit/confirm/reject flows still work.
- [x] Profile update still works.
- [x] Existing dashboard cards render correctly.

## 12.4 Playwright and manual checks

- [x] Run key UI flows with role-specific accounts.
- [x] Record results in `docs/PLAYWRIGHT_TEST_RUNS.md`.
- [x] Update manual checklist in `docs/QA.md`.

## 13) Risk Register

## 13.1 High risks

- Cross-tenant data leaks from missing filters in service queries.
- Role migration mistakes causing loss of admin capabilities.
- Broken dashboard redirects when active neighborhood context is missing.
- Backfill logic producing orphan rows.

## 13.2 Mitigations

- Centralize scope resolution in guard helpers.
- Add temporary audit logs for neighborhood IDs in service reads/writes.
- Execute migration in two deploys with DB backup checkpoint.
- Add targeted QA scripts for tenant-boundary abuse cases.

## 14) Rollout Plan

## Deploy 1

- Schema expansion (nullable columns, new tables)
- Compatibility code handling legacy and new role values
- Backfill execution

Validation gate:
- all critical flows pass in staging
- no null neighborhood IDs in scoped data after backfill

## Deploy 2

- Full tenant-scoped services and UI
- non-null constraints and final cleanup

Validation gate:
- all permission matrix checks pass
- no cross-neighborhood data exposure in API/UI smoke tests

## 15) Definition of Done

- Multi-neighborhood data model is live with non-null neighborhood scoping.
- Platform admins can create/manage neighborhoods and assign neighborhood admins.
- Neighborhood admins can fully manage only their own neighborhood data.
- Residents can use dashboard only within authorized neighborhood/group scope.
- No known cross-tenant leakage in manual QA and Playwright runs.
- All impacted documentation files are updated and aligned.
