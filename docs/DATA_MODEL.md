# Data Model

## Enums
- `role`: `user`, `admin`
- `membership_status`: `active`, `inactive`
- `poll_status`: `draft`, `active`, `closed`
- `payment_method`: `cash`, `wire_transfer`
- `payment_report_status`: `submitted`, `confirmed`, `rejected`

## users
- `id` (pk)
- `email` (unique)
- `name`
- `role`
- `status`
- `created_at`
- `updated_at`

## groups
- `id` (pk)
- `name`
- `address` (optional)
- `admin_user_id` (fk -> users.id)
- `created_at`
- `updated_at`

## group_memberships
- `id` (pk)
- `group_id` (fk -> groups.id)
- `user_id` (fk -> users.id)
- `status`
- `created_at`
- `updated_at`
- Unique: (`group_id`, `user_id`)

## polls
- `id` (pk)
- `title`
- `description`
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## poll_options
- `id` (pk)
- `poll_id` (fk -> polls.id)
- `label`
- `description` (optional)
- `amount` (optional)
- `sort_order`

## votes
- `id` (pk)
- `poll_id` (fk -> polls.id)
- `group_id` (fk -> groups.id)
- `option_id` (fk -> poll_options.id)
- `created_by` (fk -> users.id)
- `created_at`
- Unique: (`poll_id`, `group_id`)

## payment_requests
- `id` (pk)
- `title`
- `description`
- `goal_amount`
- `amount` (derived per-group amount)
- `due_date`
- `status` (open, closed)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## payment_reports
- `id` (pk)
- `payment_request_id` (fk -> payment_requests.id)
- `group_id` (fk -> groups.id)
- `submitted_by` (fk -> users.id)
- `method` (cash, wire_transfer)
- `amount`
- `wire_reference` (nullable)
- `wire_date` (nullable)
- `wire_amount` (nullable)
- `status` (submitted, confirmed, rejected)
- `confirmed_by` (fk -> users.id, nullable)
- `created_at`
- `updated_at`
  
Note: multiple reports per group are allowed.

## Indexes
- `users.email`
- `group_memberships.group_id`
- `group_memberships.user_id`
- `votes.poll_id`
- `votes.group_id`
- `payment_reports.payment_request_id`
- `payment_reports.group_id`
