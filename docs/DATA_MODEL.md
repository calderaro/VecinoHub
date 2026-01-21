# Data Model

## Enums
- `role`: `user`, `admin`
- `membership_status`: `active`, `inactive`
- `poll_status`: `draft`, `active`, `closed`
- `contribution_method`: `cash`, `wire_transfer`
- `contribution_status`: `submitted`, `confirmed`, `rejected`
- `campaign_status`: `open`, `closed`
- `post_status`: `draft`, `published`

## users
- `id` (pk)
- `email` (unique)
- `username` (unique, case-insensitive)
- `name`
- `image` (profile photo)
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

## fundraising_campaigns
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

## fundraising_contributions
- `id` (pk)
- `campaign_id` (fk -> fundraising_campaigns.id)
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
  
Note: multiple contributions per group are allowed.

## events
- `id` (pk)
- `title`
- `description` (optional)
- `starts_at`
- `ends_at` (optional)
- `location` (optional)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## posts
- `id` (pk)
- `title`
- `content`
- `status` (draft, published)
- `published_at` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## Indexes
- `users.email`
- `users.username` (case-insensitive)
- `group_memberships.group_id`
- `group_memberships.user_id`
- `votes.poll_id`
- `votes.group_id`
- `fundraising_contributions.campaign_id`
- `fundraising_contributions.group_id`
- `events.starts_at`
- `posts.status`
- `posts.published_at`
