# Permissions Matrix

## Roles
- user
- admin

## Group Admin Scope
- A group admin can manage membership for their group only.

## Permissions

### User
- View their groups and members
- View polls
- Vote on polls for their groups (neighbor UI only)
- View payment requests
- Submit and delete payment reports for their groups (while request is open)
- If admin role: can manage members in any group (add/remove)

### Admin
- All user permissions
- Create/edit/delete groups
- Assign group admins
- Manage users and roles
- Create/edit/close/re-open/reset polls
- Launch polls (draft -> active)
- Manage poll options (draft only)
- Create/edit/close payment requests
- Update payment report status

## Permission Checks (Server-Side)
- Mutations must verify role and group scope.
- Read-only SSR calls must verify membership or admin role where applicable.
