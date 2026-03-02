# Permissions Matrix

## Roles
- System roles: `user`, `platform_admin` (legacy `admin` treated as platform admin during migration compatibility).
- Neighborhood membership roles: `neighbor`, `neighborhood_admin`.
- Group delegation: `groups.admin_user_id`.

## Scope Rules
- All domain data is neighborhood-scoped.
- Server-side checks are mandatory in services for both reads and mutations.
- Client-provided neighborhood identifiers are validated against actor permissions.

## Platform Admin
- Create/update neighborhoods.
- Manage global users (role/status).
- Full CRUD across groups, polls, fundraising, events, posts.
- Assign/revoke neighborhood admin memberships.

## Neighborhood Admin
- CRUD for groups, polls, fundraising campaigns, events, and posts only in authorized neighborhoods.
- Manage group memberships in neighborhood groups.
- Manage neighborhood membership role/status in their neighborhood.
- Cannot create neighborhoods.
- Cannot assign `platform_admin` role.

## Neighbor
- Read own neighborhood/group dashboard data.
- Vote for own groups in active polls.
- Submit/delete own group contributions while campaign is open.
- Update own profile.
- Cannot access `/admin/*` or `/platform/*`.

## Group Admin (Delegated)
- Add/remove members for owned group.
- No elevated cross-neighborhood privileges.

## Required Server Checks
- Membership validation before dashboard/group read.
- Neighborhood authorization before neighborhood-scoped mutations.
- Cross-neighborhood consistency checks:
  - vote: poll neighborhood must match group neighborhood
  - contribution: campaign neighborhood must match group neighborhood
- tRPC routers must map `ServiceError` only; never leak raw errors.
