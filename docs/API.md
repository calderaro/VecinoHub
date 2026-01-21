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

### payments
- `payments.createRequest` (mutation, admin)
- `payments.updateRequest` (mutation, admin)
- `payments.closeRequest` (mutation, admin)
- `payments.submitReport` (mutation, group member)
- `payments.confirmReport` (mutation, admin)
- `payments.rejectReport` (mutation, admin)
- `payments.deleteReport` (mutation, group member/admin)
- `payments.updateReportStatus` (mutation, admin)

## Inputs (High Level)
- `groups.create`: name, address, adminUserId
- `groups.addMember`: groupId, email (or userId)
- `polls.create`: title, description
- `polls.vote`: pollId, groupId, optionId
- `payments.createRequest`: title, description, goalAmount, dueDate
- `payments.submitReport`: paymentRequestId, groupId, method, amount, wireReference?, wireDate?
