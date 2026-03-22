# Permissions Matrix

## Roles
- System roles: `user`, `platform_admin` (legacy `admin` treated as platform admin during migration compatibility).
- Neighborhood membership roles: `neighbor`, `neighborhood_admin`.
- Group membership roles: `group_member`, `group_admin`.

## Scope Rules
- All domain data is neighborhood-scoped.
- Server-side checks are mandatory in services for both reads and mutations.
- Client-provided neighborhood identifiers are validated against actor permissions.
- Resident neighborhood access is derived from active group membership in that neighborhood.
- A standalone active `neighbor` membership is not sufficient resident access if the user has no active groups in that neighborhood.

## Platform Admin
- Create/update/delete neighborhoods.
- Manage global users (profile, role, status).
- Full CRUD across groups, polls, fundraising, funds, events, posts.
- Full invite management across groups.
- Assign/revoke neighborhood admin memberships.

## Neighborhood Admin
- CRUD for groups, polls, fundraising campaigns, funds, events, and posts only in authorized neighborhoods.
- Create and manage multiple named funds in their neighborhoods.
- Create charge templates and charge periods, confirm/reject fund payments, and record fund movements.
- Manage group memberships and group roles in neighborhood groups.
- Manage group invites in neighborhood groups.
- Manage neighborhood membership role/status in their neighborhood.
- Cannot create neighborhoods.
- Cannot assign `platform_admin` role.
- May retain neighborhood access without belonging to any group in that neighborhood.

## Neighbor
- Read own neighborhood/group dashboard data only while holding at least one active group membership in that neighborhood.
- Submit group access requests for their own account while signed in.
- Read and cancel only their own access requests.
- Vote for own groups in active polls.
- Submit/delete own group contributions while campaign is open.
- Read neighborhood fund balances, confirmed movements, and group-level paid/unpaid status in authorized neighborhoods.
- Submit fund payments only for their own active groups.
- Update own profile.
- Cannot access `/admin/*` or `/platform/*`.
- A synchronized `neighbor` neighborhood membership may exist in storage, but it does not independently grant resident access.

## Group Admin
- Manage their own group details, members, and group roles.
- Create, resend, and cancel invites for their own group.
- Review, approve, and reject access requests for their own group.
- Can leave their own group if at least one other active `group_admin` remains.
- No elevated cross-neighborhood privileges.

## Group Member
- Read-only access for their own group.
- Can view and respond only to invites addressed to their own account email.
- Can leave their own active group membership.
- No group management privileges.

## Required Server Checks
- Membership validation before dashboard/group read.
- Neighborhood authorization before neighborhood-scoped mutations.
- Resident neighborhood checks must require an active group membership in the target neighborhood unless the actor is `neighborhood_admin` or `platform_admin`.
- Cross-neighborhood consistency checks:
  - vote: poll neighborhood must match group neighborhood
  - contribution: campaign neighborhood must match group neighborhood
  - fund charge template/period/movement: fund neighborhood must match the authorized neighborhood
  - fund payment: fund, group, charge period, and allocation rows must belong to the same neighborhood and fund
  - invite: group invite neighborhood must match the target group neighborhood, and invite acceptance must require an email match with the signed-in user
  - access request create: target group must belong to an active neighborhood, requester must be authenticated, and request creation must not create access directly
  - access request review: only group/neighborhood/platform managers within scope may approve or reject, and approval must activate group membership plus synchronized resident neighborhood membership
  - leave group: the actor may only leave their own active membership, and the final active `group_admin` in a group cannot leave
- tRPC routers must map `ServiceError` only; never leak raw errors.
