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
- `groups.addMember` (mutation, existing-user direct assignment path; prefer invite flow for email entry)
- `groups.removeMember` (mutation, group admin/neighborhood admin/platform)
- `groups.leave` (mutation, authenticated active group member leaving their own membership)

### groupInvites
- `groupInvites.listMine` (query, authenticated)
- `groupInvites.listForGroup` (query, group admin / neighborhood admin / platform admin)
- `groupInvites.create` (mutation, group admin / neighborhood admin / platform admin)
- `groupInvites.resend` (mutation, same scope as create)
- `groupInvites.cancel` (mutation, same scope as create)
- `groupInvites.accept` (mutation, authenticated user whose account email matches the invite email)
- `groupInvites.reject` (mutation, authenticated user whose account email matches the invite email)

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

### funds
- `funds.listFunds` / `funds.getOverview` / `funds.listPeriods` / `funds.getPeriodDetail` / `funds.listMovements` (query, neighborhood scoped)
- `funds.getGroupSummary` (query, group member scoped)
- `funds.createFund` / `funds.updateFund` (mutation, neighborhood admin or platform admin)
- `funds.createChargeTemplate` / `funds.updateChargeTemplate` (mutation, neighborhood admin or platform admin)
- `funds.createChargePeriod` / `funds.generateChargePeriod` (mutation, neighborhood admin or platform admin)
- `funds.submitPayment` (mutation, group member with scope checks)
- `funds.confirmPayment` / `funds.rejectPayment` (mutation, neighborhood admin or platform admin)
- `funds.recordExpense` / `funds.recordManualIncome` / `funds.recordAdjustment` (mutation, neighborhood admin or platform admin)
- `funds.waiveGroupCharge` / `funds.reverseMovement` (mutation, neighborhood admin or platform admin)
- all fund reads and writes are scoped by `fundId` within the authorized neighborhood

### events
- `events.list` / `events.get` (query, neighborhood scoped)
- `events.create` / `events.update` / `events.remove` (mutation, neighborhood admin or platform admin)

### posts
- `posts.list` / `posts.get` (query, neighborhood scoped)
- `posts.create` / `posts.update` / `posts.publish` / `posts.unpublish` / `posts.remove` (mutation, neighborhood admin or platform admin)

## Input Notes (high level)
- Neighborhood-scoped creates accept optional `neighborhoodId`; if omitted, services resolve from active context/admin memberships.
- `groups.create` accepts an optional initial group admin email and resolves it to an existing user server-side.
- Group invite creation accepts an email for both existing and not-yet-registered people; membership is created only on acceptance.
- `groups.leave` inactivates the signed-in user’s membership in the target group and also inactivates the synchronized `neighbor` neighborhood membership when that was the user’s last active group in the neighborhood.
- `groups.leave` must reject attempts by the last active `group_admin` in a group until another active admin exists.
- For regular residents, neighborhood-scoped reads must resolve authorization through active group membership in that neighborhood; a standalone `neighbor` membership is only a synchronized support record.
- Cross-entity writes enforce neighborhood consistency server-side.
- `users.updateRole` accepts `user | admin | platform_admin` for compatibility during transition.
- Fund mutations accept explicit `fundId` or `periodId` / `groupChargeId` as needed; services must validate that the referenced fund belongs to the authorized neighborhood.
- Fund payment submissions must validate active group membership and ensure allocations target charges within the same fund and neighborhood.
