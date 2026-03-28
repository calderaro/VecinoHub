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
- neighborhood create/update accept `timeZone` and persist an IANA timezone selected from the shared timezone catalog.
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

### groupAccessRequests
- `groupAccessRequests.listMine` (query, authenticated)
- `groupAccessRequests.lookupNeighborhood` (query, authenticated, exact active-neighborhood slug lookup for request creation)
- `groupAccessRequests.listRequestableGroups` (query, authenticated, active groups in the selected neighborhood excluding the actor's active memberships and pending requests)
- `groupAccessRequests.create` (mutation, authenticated verified user)
- `groupAccessRequests.cancel` (mutation, authenticated requester only)
- `groupAccessRequests.listForGroup` (query, group admin / neighborhood admin / platform admin)
- `groupAccessRequests.approve` (mutation, group admin / neighborhood admin / platform admin)
- `groupAccessRequests.reject` (mutation, group admin / neighborhood admin / platform admin)

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

### resources
- Reads are SSR-first through services for `/admin/[neighborhoodId]/resources*` and `/dashboard/[groupId]/resources*`.
- `resources.getCalendar` (query, authenticated, scoped by resource membership/admin checks)
- `resources.listReservations` / `resources.listBlocks` (query, neighborhood admin or platform admin)
- `resources.create` / `resources.update` / `resources.setStatus` (mutation, neighborhood admin or platform admin)
- `resources.createReservation` / `resources.cancelReservation` (mutation, active group member within the resource neighborhood)
- `resources.createBlock` / `resources.updateBlock` / `resources.removeBlock` (mutation, neighborhood admin or platform admin)
- The MVP intentionally rejects `requiresApproval = true`; approval workflows are reserved for a later phase.

### events
- `events.list` / `events.get` (query, neighborhood scoped)
- `events.create` / `events.update` / `events.remove` (mutation, neighborhood admin or platform admin)

### posts
- `posts.list` / `posts.get` (query, neighborhood scoped)
- `posts.create` / `posts.update` / `posts.publish` / `posts.unpublish` / `posts.remove` (mutation, neighborhood admin or platform admin)

## Input Notes (high level)
- Neighborhood timezone is a first-class product setting. All neighborhood-scoped date/time inputs are interpreted in that timezone before persistence.
- The UI no longer relies on native HTML `date`, `time`, or `datetime-local` inputs for product workflows.
- Date-only fields are submitted as normalized calendar values and stored/validated as neighborhood-local dates.
- Time-only fields are submitted as neighborhood-local wall-clock values.
- Datetime flows convert neighborhood-local selections to UTC only after validation/service parsing.
- Neighborhood-scoped creates accept optional `neighborhoodId`; if omitted, services resolve from active context/admin memberships.
- `groups.create` accepts an optional initial group admin email and resolves it to an existing user server-side.
- Group invite creation accepts an email for both existing and not-yet-registered people; membership is created only on acceptance.
- Group access request creation is signed-in-user initiated; it must not create any membership until an authorized reviewer approves it.
- Group access request approval always grants `group_member` and reactivates the synchronized `neighbor` neighborhood membership for the requester.
- `groups.leave` inactivates the signed-in user’s membership in the target group and also inactivates the synchronized `neighbor` neighborhood membership when that was the user’s last active group in the neighborhood.
- `groups.leave` must reject attempts by the last active `group_admin` in a group until another active admin exists.
- For regular residents, neighborhood-scoped reads must resolve authorization through active group membership in that neighborhood; a standalone `neighbor` membership is only a synchronized support record.
- Cross-entity writes enforce neighborhood consistency server-side.
- `users.updateRole` accepts `user | admin | platform_admin` for compatibility during transition.
- Fund mutations accept explicit `fundId` or `periodId` / `groupChargeId` as needed; services must validate that the referenced fund belongs to the authorized neighborhood.
- Fund payment submissions must validate active group membership and ensure allocations target charges within the same fund and neighborhood.
- Resource mutations accept explicit `resourceId` and validate that the acting user belongs to or administers the resource neighborhood.
- Reservation creation validates resource status, timezone-aware advance notice, weekly availability windows, duration, overlap/buffer conflicts, administrative blocks, per-group quotas, and optional overdue-dues restrictions.
- Reservation cancellation validates membership or admin scope and enforces `cancellationLimitHours` for resident-initiated cancellations.
- Event, fund, fundraising, and resource scheduling/display flows render using neighborhood port time, not browser-local time.
