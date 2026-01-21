# API Contract (tRPC)

## Conventions
- All mutations go through tRPC.
- All read-only data should use services directly in SSR pages where possible.

## Routers

### auth
- `auth.getSession` (query)
  - Returns current session and user.

### users
- `users.list` (query, admin)
- `users.updateRole` (mutation, admin)
- `users.updateStatus` (mutation, admin)
- `users.updateProfile` (mutation, user)

### groups
- `groups.list` (query, admin)
- `groups.create` (mutation, admin)
- `groups.update` (mutation, admin)
- `groups.remove` (mutation, admin)
- `groups.assignAdmin` (mutation, admin)
- `groups.addMember` (mutation, group admin)
- `groups.removeMember` (mutation, group admin)

### polls
- `polls.create` (mutation, admin)
- `polls.update` (mutation, admin)
- `polls.close` (mutation, admin)
- `polls.reopen` (mutation, admin)
- `polls.reset` (mutation, admin)
- `polls.addOption` (mutation, admin)
- `polls.updateOption` (mutation, admin)
- `polls.removeOption` (mutation, admin)
- `polls.vote` (mutation, group member)

### fundraising
- `fundraising.createCampaign` (mutation, admin)
- `fundraising.updateCampaign` (mutation, admin)
- `fundraising.closeCampaign` (mutation, admin)
- `fundraising.submitContribution` (mutation, group member)
- `fundraising.confirmContribution` (mutation, admin)
- `fundraising.rejectContribution` (mutation, admin)
- `fundraising.deleteContribution` (mutation, group member/admin)
- `fundraising.updateContributionStatus` (mutation, admin)

### events
- `events.list` (query)
- `events.get` (query)
- `events.create` (mutation, admin)
- `events.update` (mutation, admin)
- `events.remove` (mutation, admin)

### posts
- `posts.list` (query)
- `posts.get` (query)
- `posts.create` (mutation, admin)
- `posts.update` (mutation, admin)
- `posts.publish` (mutation, admin)
- `posts.unpublish` (mutation, admin)
- `posts.remove` (mutation, admin)

## Inputs (High Level)
- `groups.create`: name, address, adminUserId
- `groups.addMember`: groupId, email (or userId)
- `polls.create`: title, description
- `polls.vote`: pollId, groupId, optionId
- `fundraising.createCampaign`: title, description, goalAmount, dueDate
- `fundraising.submitContribution`: campaignId, groupId, method, amount, wireReference?, wireDate?
- `users.updateProfile`: username, image
- `events.create`: title, startsAt, endsAt?, location?, description?
- `posts.create`: title, content, status?
