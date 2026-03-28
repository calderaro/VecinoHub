# Product Requirements Document — VecinoHub

## 1) Overview
VecinoHub is a multi-neighborhood administration web app where residents (organized by house groups) can manage membership, vote on polls, submit fundraising contributions, manage neighborhood funds, reserve neighborhood resources, and consume neighborhood announcements/events.

Stack: Next.js, tRPC, SuperJSON, Tailwind, TypeScript, Drizzle, PostgreSQL, better-auth.

## 2) Goals
- Support multiple neighborhoods in a single deployment.
- Introduce a clear 3-level access model:
  - `platform_admin` (global management)
  - `neighborhood_admin` (management scoped to one neighborhood)
  - `neighbor` (resident experience)
- Keep resident dashboard flows intact while enforcing strict tenant isolation.
- Preserve group-level delegation with per-group membership roles.

## 3) Non-Goals (Current Iteration)
- Billing, tenant provisioning APIs, or per-neighborhood custom domains.
- Custom role builders beyond platform/neighborhood/group scope.
- Native mobile applications.

## 4) User and Role Model

### System role (`users.role`)
- `user`
- `platform_admin`

### Neighborhood membership role (`neighborhood_memberships.role`)
- `neighbor`
- `neighborhood_admin`

### Group membership role (`group_memberships.role`)
- `group_member`
- `group_admin`

## 5) Core Entities
- `users`
- `neighborhoods`
- `neighborhood_memberships`
- `groups`
- `group_memberships`
- `polls`, `poll_options`, `votes`
- `fundraising_campaigns`, `fundraising_contributions`
- `neighborhood_funds`, `fund_charge_templates`, `fund_charge_periods`
- `fund_group_charges`, `fund_payment_submissions`, `fund_payment_allocations`, `fund_movements`
- `resources`, `resource_availability_windows`, `resource_rules`, `resource_reservations`, `resource_blocks`
- `events`
- `posts`

All domain entities (`groups`, `polls`, `fundraising_campaigns`, `neighborhood_funds`, `fund_charge_templates`, `fund_charge_periods`, `resources`, `events`, `posts`) are neighborhood-scoped.

## 6) Core Flows

### Platform administration
- Create and update neighborhoods.
- Assign/revoke neighborhood admin role through neighborhood memberships.
- Manage global user system roles and statuses.

### Neighborhood administration
- Manage groups and group memberships within authorized neighborhoods only.
- Manage neighborhood polls, campaigns, funds, reservable resources, events, and posts.
- Manage multiple named funds, dues, payment confirmations, and fund movements.
- Configure weekly resource availability, reservation rules, and administrative blackout windows.
- Read and operate only within their neighborhood boundaries.

### Resident dashboard
- Access dashboard only for groups where user is an active member.
- Resident access to a neighborhood is derived from having at least one active group membership in that neighborhood.
- A standalone `neighbor` neighborhood membership must not grant resident access if the user has no active group memberships in that neighborhood.
- Registered users who are not yet group members may submit a request to join a neighborhood group for manager approval; the request itself must not grant access before approval.
- View and participate in neighborhood-scoped polls, fundraising, funds, resources, events, and posts.
- View neighborhood fund balances and confirmed movements and track paid/unpaid status by group.
- Submit fund payments for their own group.
- Browse available neighborhood resources, review availability, create reservations for their own group, and cancel eligible reservations.
- Update own profile and switch active neighborhood context when member of multiple neighborhoods.

## 7) Permission Summary
- `platform_admin`: full cross-neighborhood read/write and user role management.
- `neighborhood_admin`: CRUD for neighborhood content, funds, resources, and group management only in authorized neighborhoods.
- `neighbor`: resident access derived from active group membership in the neighborhood; used as a synchronized neighborhood-scoped role record rather than an independent access grant.
- `group_admin`: manage only their own group details, members, and group roles.
- `group_member`: read-only access for their own group.

## 8) Route Model
- Resident: `/dashboard`, `/dashboard/[groupId]/*`
- Neighborhood admin shell: `/admin/*`
- Platform admin shell: `/platform/*`

## 9) Success Criteria
- Platform admin can create/manage neighborhoods.
- Neighborhood admins cannot access or modify foreign neighborhood data.
- Residents cannot access admin/platform shells.
- No cross-tenant leaks in service-level read/write flows.
- Residents can view neighborhood fund balances and confirmed movements only in authorized neighborhoods.
- Neighborhood admins can manage multiple named funds and confirm fund payments only in their neighborhoods.
- Neighborhood admins can create and manage reservable resources, reservation rules, and administrative blocks only in their neighborhoods.
- Residents can browse resource availability, create non-overlapping reservations for their own group, and cancel eligible reservations within configured policy windows.
- Reservation validation is evaluated in the neighborhood timezone rather than server-local time.
- Every neighborhood-scoped date and time is rendered in the neighborhood timezone ("port time"), not the browser timezone.
- Timezone selection is restricted to valid IANA timezone ids sourced from the shared timezone catalog.
- Native HTML date/time inputs are fully replaced by reusable dialog-based selectors for date-only, time-only, and datetime interactions.
- `npm run lint` and `npm run build` pass after migration and refactor.

## 9.1) Port-Time UX Rules
- `neighborhoods.timeZone` is the canonical timezone for all neighborhood-scoped scheduling and presentation.
- Browser-local timezone must not influence neighborhood-scoped display values, calendar labels, validation windows, or mutation payload interpretation.
- Date-only inputs are interpreted as neighborhood-local calendar dates.
- Time-only inputs are interpreted as neighborhood-local wall-clock values.
- Datetime inputs are interpreted as neighborhood-local selections first and converted to UTC only at the service boundary.
- The reusable datetime picker is the standard interaction model for scheduling flows across resources, events, fundraising, and funds.

## 10) Open Follow-ups
- Whether legacy `admin` system role compatibility should be fully removed after transition window.
- Whether route-level neighborhood slug (`/n/[slug]`) should become canonical in a future release.
