# API Contract (tRPC)

## Conventions
- All mutations go through tRPC.
- SSR pages call services directly for read-heavy flows.
- Routers stay thin and delegate validation/business logic to services.

## Routers

### auth
- `auth.getSession` (query)

### neighborhoods
- `neighborhoods.list` (query)
  - `platform_admin`: all neighborhoods
  - others: only neighborhoods where user has active membership
- `neighborhoods.getById` (query)
- `neighborhoods.create` (mutation, `platform_admin`)
- `neighborhoods.update` (mutation, `platform_admin`)
- `neighborhoods.remove` (mutation, `platform_admin`)
- `neighborhoods.listMembers` (query, neighborhood admin or platform admin)
- `neighborhoods.addMemberByEmail` (mutation, neighborhood admin or platform admin)
- `neighborhoods.setMemberRole` (mutation, neighborhood admin or platform admin)
- `neighborhoods.updateMembershipStatus` (mutation, neighborhood admin or platform admin)
- `neighborhoods.setActiveContext` (mutation, authenticated)
  - sets/clears `vh_active_neighborhood` cookie

### users
- `users.list` (query, `platform_admin`)
- `users.updateRole` (mutation, `platform_admin`)
- `users.updateStatus` (mutation, `platform_admin`)
- `users.updateProfile` (mutation, authenticated user)
- `users.updateProfileByAdmin` (mutation, `platform_admin`)

### groups
- `groups.list` (query, scoped by neighborhood permissions)
 - `groups.create` (mutation, neighborhood admin or platform admin; may be created without any members)
- `groups.update` (mutation, neighborhood admin/platform or group admin as allowed)
- `groups.remove` (mutation, neighborhood admin/platform or group admin as allowed)
- `groups.setMemberRole` (mutation, group admin/neighborhood admin/platform)
- `groups.addMember` (mutation, group admin/neighborhood admin/platform; optional `group_member` / `group_admin` role)
- `groups.removeMember` (mutation, group admin/neighborhood admin/platform)

### polls
- `polls.create` / `polls.update` / `polls.close` / `polls.reopen` / `polls.reset` (mutation, neighborhood admin or platform admin)
- `polls.addOption` / `polls.updateOption` / `polls.removeOption` (mutation, neighborhood admin or platform admin)
- `polls.vote` (mutation, group member)
- `polls.list` / `polls.get` (query, neighborhood scoped)

### fundraising
- `fundraising.createCampaign` / `fundraising.updateCampaign` / `fundraising.closeCampaign` (mutation, neighborhood admin or platform admin)
- `fundraising.submitContribution` / `fundraising.deleteContribution` (mutation, group member with scope checks)
- `fundraising.confirmContribution` / `fundraising.rejectContribution` / `fundraising.updateContributionStatus` (mutation, neighborhood admin or platform admin)
- list/detail/progress/stats queries are neighborhood scoped

### events
- `events.list` / `events.get` (query, neighborhood scoped)
- `events.create` / `events.update` / `events.remove` (mutation, neighborhood admin or platform admin)

### posts
- `posts.list` / `posts.get` (query, neighborhood scoped)
- `posts.create` / `posts.update` / `posts.publish` / `posts.unpublish` / `posts.remove` (mutation, neighborhood admin or platform admin)

## Input Notes (high level)
- Neighborhood-scoped creates accept optional `neighborhoodId`; if omitted, services resolve from active context/admin memberships.
- Cross-entity writes enforce neighborhood consistency server-side.
- `users.updateRole` accepts `user | admin | platform_admin` for compatibility during transition.
