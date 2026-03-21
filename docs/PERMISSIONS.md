# Permissions Matrix

## Roles
- System roles: `user`, `platform_admin` (legacy `admin` treated as platform admin during migration compatibility).
- Neighborhood membership roles: `neighbor`, `neighborhood_admin`.
- Group membership roles: `group_member`, `group_admin`.

## Scope Rules
- All domain data is neighborhood-scoped.
- Server-side checks are mandatory in services for both reads and mutations.
- Client-provided neighborhood identifiers are validated against actor permissions.

## Platform Admin
- Create/update/delete neighborhoods.
- Manage global users (profile, role, status).
- Full CRUD across groups, polls, fundraising, funds, events, posts.
- Assign/revoke neighborhood admin memberships.

## Neighborhood Admin
- CRUD for groups, polls, fundraising campaigns, funds, events, and posts only in authorized neighborhoods.
- Create and manage multiple named funds in their neighborhoods.
- Create charge templates and charge periods, confirm/reject fund payments, and record fund movements.
- Manage group memberships and group roles in neighborhood groups.
- Manage neighborhood membership role/status in their neighborhood.
- Cannot create neighborhoods.
- Cannot assign `platform_admin` role.

## Neighbor
- Read own neighborhood/group dashboard data.
- Vote for own groups in active polls.
- Submit/delete own group contributions while campaign is open.
- Read neighborhood fund balances, confirmed movements, and group-level paid/unpaid status in authorized neighborhoods.
- Submit fund payments only for their own active groups.
- Update own profile.
- Cannot access `/admin/*` or `/platform/*`.

## Group Admin
- Manage their own group details, members, and group roles.
- No elevated cross-neighborhood privileges.

## Group Member
- Read-only access for their own group.
- No group management privileges.

## Required Server Checks
- Membership validation before dashboard/group read.
- Neighborhood authorization before neighborhood-scoped mutations.
- Cross-neighborhood consistency checks:
  - vote: poll neighborhood must match group neighborhood
  - contribution: campaign neighborhood must match group neighborhood
  - fund charge template/period/movement: fund neighborhood must match the authorized neighborhood
  - fund payment: fund, group, charge period, and allocation rows must belong to the same neighborhood and fund
- tRPC routers must map `ServiceError` only; never leak raw errors.
