# Data Model

## Enums
- `role`: `user`, `admin`, `platform_admin` (legacy `admin` retained for transition compatibility)
- `user_status`: `active`, `inactive`
- `neighborhood_status`: `active`, `inactive`
- `neighborhood_role`: `neighbor`, `neighborhood_admin`
- `neighborhood_membership_status`: `active`, `inactive`
- `group_role`: `group_member`, `group_admin`
- `membership_status`: `active`, `inactive`
- `group_invite_status`: `pending`, `accepted`, `rejected`, `cancelled`, `expired`
- `group_access_request_status`: `pending`, `approved`, `rejected`, `cancelled`, `expired`
- `poll_status`: `draft`, `active`, `closed`
- `contribution_method`: `cash`, `wire_transfer`
- `contribution_status`: `submitted`, `confirmed`, `rejected`
- `campaign_status`: `open`, `closed`
- `fund_status`: `active`, `archived`
- `fund_template_status`: `active`, `paused`, `archived`
- `fund_charge_frequency`: `monthly`, `quarterly`, `annual`, `one_off`
- `fund_charge_period_status`: `open`, `closed`, `cancelled`
- `fund_group_charge_status`: `unpaid`, `partial`, `paid`, `overdue`, `waived`
- `fund_payment_status`: `submitted`, `confirmed`, `rejected`
- `fund_payment_method`: `cash`, `wire_transfer`
- `fund_movement_type`: `opening_balance`, `payment`, `expense`, `manual_income`, `adjustment`, `reversal`
- `fund_entry_side`: `credit`, `debit`
- `post_status`: `draft`, `published`
- `resource_status`: `active`, `inactive`
- `resource_reservation_status`: `approved`, `cancelled`, `completed`, `expired`
- `resource_block_reason`: `maintenance`, `cleaning`, `repair`, `neighborhood_event`, `unavailable`, `other`

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
- `time_zone` (IANA timezone, default `America/Mexico_City`)
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
- Semantics:
  - `neighborhood_admin` memberships are explicit and can exist without any group membership.
  - `neighbor` memberships are synchronized support records for resident scoping and should reflect whether the user has at least one active `group_membership` in the same neighborhood.
  - A standalone active `neighbor` membership must not be treated as sufficient resident access when the user has zero active groups in that neighborhood.

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
- Semantics:
  - Active resident access is anchored here.
  - A user’s active group memberships determine whether they should retain active `neighbor` status in the parent neighborhood.

## group_invites
- `id` (pk)
- `group_id` (fk -> groups.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `email` (case-insensitive invite target)
- `role`
- `status`
- `token_hash` (unique)
- `invited_by` (fk -> users.id)
- `responded_by` (fk -> users.id, nullable)
- `last_sent_at`
- `expires_at`
- `accepted_at` (nullable)
- `rejected_at` (nullable)
- `cancelled_at` (nullable)
- `created_at`
- `updated_at`
- Unique: one active pending invite per (`group_id`, lower(`email`))

## group_access_requests
- `id` (pk)
- `group_id` (fk -> groups.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `requested_by` (fk -> users.id)
- `status`
- `note` (nullable)
- `reviewed_by` (fk -> users.id, nullable)
- `reviewed_at` (nullable)
- `approved_at` (nullable)
- `rejected_at` (nullable)
- `cancelled_at` (nullable)
- `expires_at`
- `created_at`
- `updated_at`
- Unique: one active pending request per (`group_id`, `requested_by`)
- Semantics:
  - Requests are user-initiated and never grant access on creation.
  - Approval creates or reactivates the target `group_membership`.
  - Approval also reactivates the synchronized `neighbor` membership in the parent neighborhood.
  - Requests are scoped to a single group and one signed-in requester account.

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

## neighborhood_funds
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `name`
- `description` (nullable)
- `currency_code`
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`
- Unique: (`neighborhood_id`, lower(`name`))

## fund_charge_templates
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `status`
- `frequency`
- `default_amount`
- `due_day_of_month` (nullable)
- `starts_on`
- `ends_on` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## fund_charge_periods
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `template_id` (fk -> fund_charge_templates.id, nullable)
- `neighborhood_id` (fk -> neighborhoods.id)
- `title`
- `description` (nullable)
- `amount_per_group`
- `due_date`
- `status`
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`

## fund_group_charges
- `id` (pk)
- `period_id` (fk -> fund_charge_periods.id)
- `group_id` (fk -> groups.id)
- `amount_due`
- `amount_paid`
- `status`
- `waived_by` (fk -> users.id, nullable)
- `waived_reason` (nullable)
- `created_at`
- `updated_at`
- Unique: (`period_id`, `group_id`)

## fund_payment_submissions
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `group_charge_id` (fk -> fund_group_charges.id)
- `group_id` (fk -> groups.id)
- `submitted_by` (fk -> users.id)
- `method`
- `amount`
- `paid_at`
- `reference` (nullable)
- `notes` (nullable)
- `status`
- `confirmed_by` (fk -> users.id, nullable)
- `confirmed_at` (nullable)
- `rejection_reason` (nullable)
- `created_at`
- `updated_at`

## fund_payment_allocations
- `id` (pk)
- `payment_id` (fk -> fund_payment_submissions.id)
- `group_charge_id` (fk -> fund_group_charges.id)
- `amount`
- `created_at`
- Unique: (`payment_id`, `group_charge_id`)

## fund_movements
- `id` (pk)
- `fund_id` (fk -> neighborhood_funds.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `type`
- `entry_side`
- `amount`
- `effective_at`
- `description`
- `source_type`
- `source_id` (nullable)
- `created_by` (fk -> users.id)
- `created_at`

## resources
- `id` (pk)
- `neighborhood_id` (fk -> neighborhoods.id)
- `name`
- `description` (nullable)
- `type` (nullable)
- `location` (nullable)
- `capacity` (nullable)
- `status`
- `requires_approval` (stored for forward compatibility; MVP only supports `false`)
- `requires_deposit`
- `deposit_amount` (nullable)
- `reservation_fee_amount` (nullable)
- `usage_rules` (nullable)
- `terms_text` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`
- Unique: (`neighborhood_id`, lower(`name`))

## resource_availability_windows
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `day_of_week` (`0` Sunday through `6` Saturday)
- `start_minute`
- `end_minute`
- `created_at`
- `updated_at`
- Semantics:
  - Windows define recurring weekly availability in the parent neighborhood timezone.
  - Reservations must fit entirely inside one configured window for the requested day.

## resource_rules
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `min_advance_hours`
- `max_advance_days`
- `max_reservations_per_month` (nullable)
- `max_reservations_per_year` (nullable)
- `max_active_reservations` (nullable)
- `min_duration_minutes`
- `max_duration_minutes`
- `buffer_before_minutes`
- `buffer_after_minutes`
- `max_concurrent_reservations`
- `require_no_debt`
- `cancellation_limit_hours` (nullable)
- `late_cancellation_counts_as_usage`
- `late_cancellation_forfeits_deposit`
- `created_at`
- `updated_at`
- Unique: (`resource_id`)

## resource_reservations
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `group_id` (fk -> groups.id)
- `requested_by` (fk -> users.id)
- `start_at`
- `end_at`
- `title`
- `notes` (nullable)
- `attendee_count` (nullable)
- `status`
- `cancelled_by` (fk -> users.id, nullable)
- `cancelled_at` (nullable)
- `cancellation_reason` (nullable)
- `completed_at` (nullable)
- `deposit_status` (nullable, reserved for later phases)
- `deposit_reference` (nullable, reserved for later phases)
- `created_at`
- `updated_at`
- Semantics:
  - Reservation limits are enforced per `group_id` so usage is scoped to the house/unit, not the individual user.
  - Only non-overlapping reservations that satisfy weekly availability, advance notice, duration, quota, block, and overdue-dues rules may be created.

## resource_blocks
- `id` (pk)
- `resource_id` (fk -> resources.id)
- `neighborhood_id` (fk -> neighborhoods.id)
- `start_at`
- `end_at`
- `reason`
- `reason_text` (nullable)
- `created_by` (fk -> users.id)
- `created_at`
- `updated_at`
- Semantics:
  - Blocks represent maintenance, cleaning, repairs, neighborhood events, or other administrative blackout windows.

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
- Service-layer validations enforce cross-table neighborhood consistency (poll/group vote, campaign/group contribution, fund/fund period/group charge/payment relationships).
- Critical indexes include:
  - `neighborhoods.lower(slug)` unique
  - `neighborhood_memberships(neighborhood_id, user_id)` unique
  - `groups.neighborhood_id`
  - `group_invites(group_id, status)`
  - `group_invites(lower(email), status)`
  - `group_access_requests(group_id, status)`
  - `group_access_requests(requested_by, status)`
  - `polls.neighborhood_id`
  - `fundraising_campaigns.neighborhood_id`
  - `neighborhood_funds(neighborhood_id)`
  - `neighborhood_funds(neighborhood_id, lower(name))` unique
  - `fund_charge_templates(fund_id)`
  - `fund_charge_periods(fund_id)`
  - `fund_group_charges(period_id, group_id)` unique
  - `fund_payment_submissions(fund_id)`
  - `fund_payment_submissions(group_id)`
  - `fund_movements(fund_id, effective_at)`
  - `events.neighborhood_id`
  - `posts.neighborhood_id`

## Fund Modeling Notes
- A neighborhood may have multiple named funds.
- Fund balances are derived from `fund_movements`, not stored as a mutable balance field.
- Only confirmed payment flows create `payment` movements.
- `fund_payment_allocations` allow partial payments and one payment covering multiple charge periods.
- Waiving a `fund_group_charge` changes receivables, not available cash.
