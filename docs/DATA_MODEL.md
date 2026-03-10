# Data Model

## Enums
- `role`: `user`, `admin`, `platform_admin` (legacy `admin` retained for transition compatibility)
- `user_status`: `active`, `inactive`
- `neighborhood_status`: `active`, `inactive`
- `neighborhood_role`: `neighbor`, `neighborhood_admin`
- `neighborhood_membership_status`: `active`, `inactive`
- `group_role`: `group_member`, `group_admin`
- `membership_status`: `active`, `inactive`
- `poll_status`: `draft`, `active`, `closed`
- `contribution_method`: `cash`, `wire_transfer`
- `contribution_status`: `submitted`, `confirmed`, `rejected`
- `campaign_status`: `open`, `closed`
- `post_status`: `draft`, `published`

## users
- `id` (pk)
- `email` (unique, case-insensitive)
- `username` (unique, case-insensitive, nullable)
- `name`
- `image` (nullable)
- `preferred_language`
- `role`
- `status`
- `created_at`
- `updated_at`

## neighborhoods
- `id` (pk)
- `name`
- `slug` (unique, case-insensitive)
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## neighborhood_memberships
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `user_id` (fk -> users.id)
- `role`
- `status`
- `created_at`
- `updated_at`
- Unique: (`neighborhood_id`, `user_id`)

## groups
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `name`
- `address` (nullable)
- `created_at`
- `updated_at`

## group_memberships
- `id` (pk)
- `group_id` (fk -> groups.id)
- `user_id` (fk -> users.id)
- `role`
- `status`
- `created_at`
- `updated_at`
- Unique: (`group_id`, `user_id`)

## polls
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## poll_options
- `id` (pk)
- `poll_id` (fk -> polls.id)
- `label`
- `description` (nullable)
- `amount` (nullable)
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
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `amount` (derived per-group)
- `goal_amount`
- `due_date` (nullable)
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## fundraising_contributions
- `id` (pk)
- `campaign_id` (fk -> fundraising_campaigns.id)
- `group_id` (fk -> groups.id)
- `submitted_by` (fk -> users.id)
- `method`
- `amount`
- `wire_reference` (nullable)
- `wire_date` (nullable)
- `wire_amount` (nullable)
- `status`
- `confirmed_by` (fk -> users.id, nullable)
- `created_at`
- `updated_at`

## events
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `starts_at`
- `ends_at` (nullable)
- `location` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## posts
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `content`
- `status`
- `published_at` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## Key Constraints and Indexing Notes
- All neighborhood-scoped domain tables enforce `neighborhood_id IS NOT NULL`.
- Service-layer validations enforce cross-table neighborhood consistency (poll/group vote, campaign/group contribution).
- Critical indexes include:
  - `neighborhoods.lower(slug)` unique
  - `neighborhood_memberships(neighborhood_id, user_id)` unique
  - `groups.neighborhood_id`
  - `polls.neighborhood_id`
  - `fundraising_campaigns.neighborhood_id`
  - `events.neighborhood_id`
  - `posts.neighborhood_id`
