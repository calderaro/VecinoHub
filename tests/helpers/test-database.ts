import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/pg-proxy";
import { newDb, DataType } from "pg-mem";

import * as schema from "@/db/schema";

const mem = newDb({ autoCreateForeignKeyIndices: true });
mem.public.registerFunction({
  name: "gen_random_uuid",
  returns: DataType.uuid,
  implementation: () => randomUUID(),
});
mem.public.none(`
  CREATE TYPE role AS ENUM ('user', 'admin', 'platform_admin');
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
  CREATE TYPE neighborhood_status AS ENUM ('active', 'inactive');
  CREATE TYPE neighborhood_role AS ENUM ('neighbor', 'neighborhood_admin');
  CREATE TYPE neighborhood_membership_status AS ENUM ('active', 'inactive');
  CREATE TYPE group_role AS ENUM ('group_member', 'group_admin');
  CREATE TYPE membership_status AS ENUM ('active', 'inactive');
  CREATE TYPE group_invite_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
  CREATE TYPE group_access_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'expired');
  CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');
  CREATE TYPE contribution_method AS ENUM ('cash', 'wire_transfer');
  CREATE TYPE contribution_status AS ENUM ('submitted', 'confirmed', 'rejected');
  CREATE TYPE campaign_status AS ENUM ('open', 'closed');
  CREATE TYPE fund_status AS ENUM ('active', 'archived');
  CREATE TYPE fund_template_status AS ENUM ('active', 'paused', 'archived');
  CREATE TYPE fund_charge_frequency AS ENUM ('monthly', 'quarterly', 'annual', 'one_off');
  CREATE TYPE fund_charge_period_status AS ENUM ('open', 'closed', 'cancelled');
  CREATE TYPE fund_group_charge_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue', 'waived');
  CREATE TYPE fund_payment_status AS ENUM ('submitted', 'confirmed', 'rejected');
  CREATE TYPE fund_payment_method AS ENUM ('cash', 'wire_transfer');
  CREATE TYPE fund_movement_type AS ENUM ('opening_balance', 'payment', 'expense', 'manual_income', 'adjustment', 'reversal');
  CREATE TYPE fund_entry_side AS ENUM ('credit', 'debit');
  CREATE TYPE resource_status AS ENUM ('active', 'inactive');
  CREATE TYPE resource_reservation_status AS ENUM ('approved', 'cancelled', 'completed', 'expired');
  CREATE TYPE resource_block_reason AS ENUM ('maintenance', 'cleaning', 'repair', 'neighborhood_event', 'unavailable', 'other');
  CREATE TYPE help_feedback_response AS ENUM ('yes', 'no');

  CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    email_verified boolean NOT NULL DEFAULT false,
    name text NOT NULL,
    username text,
    image text,
    preferred_language text NOT NULL DEFAULT 'es',
    role role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE neighborhood_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role neighborhood_role NOT NULL DEFAULT 'neighbor',
    status neighborhood_membership_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE neighborhoods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    time_zone text NOT NULL DEFAULT 'America/Mexico_City',
    status neighborhood_status NOT NULL DEFAULT 'active',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE group_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role group_role NOT NULL DEFAULT 'group_member',
    status membership_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE group_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    email text NOT NULL,
    role group_role NOT NULL DEFAULT 'group_member',
    status group_invite_status NOT NULL DEFAULT 'pending',
    token_hash text NOT NULL,
    invited_by uuid NOT NULL,
    responded_by uuid,
    last_sent_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    rejected_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX group_invites_token_hash_unique ON group_invites (token_hash);
  CREATE INDEX group_invites_group_status_idx ON group_invites (group_id, status);
  CREATE INDEX group_invites_neighborhood_status_idx ON group_invites (neighborhood_id, status);
  CREATE INDEX group_invites_email_status_idx ON group_invites (lower(email), status);

  CREATE TABLE group_access_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status group_access_request_status NOT NULL DEFAULT 'pending',
    note text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    approved_at timestamptz,
    rejected_at timestamptz,
    cancelled_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX group_access_requests_group_status_idx ON group_access_requests (group_id, status);
  CREATE INDEX group_access_requests_neighborhood_status_idx ON group_access_requests (neighborhood_id, status);
  CREATE INDEX group_access_requests_requested_by_status_idx ON group_access_requests (requested_by, status);
  CREATE INDEX group_access_requests_expires_at_idx ON group_access_requests (expires_at);

  CREATE TABLE polls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status poll_status NOT NULL DEFAULT 'draft',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE poll_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id uuid NOT NULL,
    label text NOT NULL,
    description text,
    amount numeric(12, 2),
    sort_order integer NOT NULL DEFAULT 0
  );

  CREATE TABLE votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id uuid NOT NULL,
    group_id uuid NOT NULL,
    option_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX votes_poll_group_unique ON votes (poll_id, group_id);

  CREATE TABLE fundraising_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric(12, 2) NOT NULL,
    goal_amount numeric(12, 2) NOT NULL,
    due_date date,
    status campaign_status NOT NULL DEFAULT 'open',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE fundraising_contributions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL,
    group_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    method contribution_method NOT NULL,
    amount numeric(12, 2) NOT NULL,
    wire_reference text,
    wire_date date,
    wire_amount numeric(12, 2),
    status contribution_status NOT NULL DEFAULT 'submitted',
    confirmed_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE neighborhood_funds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    currency_code text NOT NULL DEFAULT 'MXN',
    status fund_status NOT NULL DEFAULT 'active',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX neighborhood_funds_neighborhood_name_unique
    ON neighborhood_funds (neighborhood_id, lower(name));

  CREATE TABLE fund_charge_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status fund_template_status NOT NULL DEFAULT 'active',
    frequency fund_charge_frequency NOT NULL,
    default_amount numeric(12, 2) NOT NULL,
    due_day_of_month integer,
    starts_on date NOT NULL,
    ends_on date,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE fund_charge_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL,
    template_id uuid,
    neighborhood_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    amount_per_group numeric(12, 2) NOT NULL,
    due_date date NOT NULL,
    status fund_charge_period_status NOT NULL DEFAULT 'open',
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE fund_group_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id uuid NOT NULL,
    group_id uuid NOT NULL,
    amount_due numeric(12, 2) NOT NULL,
    amount_paid numeric(12, 2) NOT NULL DEFAULT '0',
    status fund_group_charge_status NOT NULL DEFAULT 'unpaid',
    waived_by uuid,
    waived_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX fund_group_charges_period_group_unique
    ON fund_group_charges (period_id, group_id);

  CREATE TABLE fund_payment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    group_charge_id uuid NOT NULL,
    group_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    method fund_payment_method NOT NULL,
    amount numeric(12, 2) NOT NULL,
    paid_at date NOT NULL,
    reference text,
    notes text,
    status fund_payment_status NOT NULL DEFAULT 'submitted',
    confirmed_by uuid,
    confirmed_at timestamptz,
    rejection_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE fund_payment_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    group_charge_id uuid NOT NULL,
    amount numeric(12, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX fund_payment_allocations_payment_charge_unique
    ON fund_payment_allocations (payment_id, group_charge_id);

  CREATE TABLE fund_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    type fund_movement_type NOT NULL,
    entry_side fund_entry_side NOT NULL,
    amount numeric(12, 2) NOT NULL,
    effective_at timestamptz NOT NULL DEFAULT now(),
    description text NOT NULL,
    source_type text NOT NULL,
    source_id uuid,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text,
    location text,
    capacity integer,
    status resource_status NOT NULL DEFAULT 'active',
    requires_approval boolean NOT NULL DEFAULT false,
    requires_deposit boolean NOT NULL DEFAULT false,
    deposit_amount numeric(12, 2),
    reservation_fee_amount numeric(12, 2),
    usage_rules text,
    terms_text text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX resources_neighborhood_name_unique
    ON resources (neighborhood_id, lower(name));

  CREATE TABLE resource_availability_windows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_minute integer NOT NULL,
    end_minute integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX resource_availability_windows_resource_day_idx
    ON resource_availability_windows (resource_id, day_of_week);

  CREATE TABLE resource_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL,
    min_advance_hours integer NOT NULL DEFAULT 0,
    max_advance_days integer NOT NULL DEFAULT 30,
    max_reservations_per_month integer,
    max_reservations_per_year integer,
    max_active_reservations integer,
    min_duration_minutes integer NOT NULL DEFAULT 60,
    max_duration_minutes integer NOT NULL DEFAULT 360,
    buffer_before_minutes integer NOT NULL DEFAULT 0,
    buffer_after_minutes integer NOT NULL DEFAULT 0,
    max_concurrent_reservations integer NOT NULL DEFAULT 1,
    require_no_debt boolean NOT NULL DEFAULT false,
    cancellation_limit_hours integer,
    late_cancellation_counts_as_usage boolean NOT NULL DEFAULT false,
    late_cancellation_forfeits_deposit boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX resource_rules_resource_unique
    ON resource_rules (resource_id);

  CREATE TABLE resource_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    group_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    title text NOT NULL,
    notes text,
    attendee_count integer,
    status resource_reservation_status NOT NULL DEFAULT 'approved',
    cancelled_by uuid,
    cancelled_at timestamptz,
    cancellation_reason text,
    completed_at timestamptz,
    deposit_status text,
    deposit_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX resource_reservations_resource_start_idx
    ON resource_reservations (resource_id, start_at);
  CREATE INDEX resource_reservations_group_start_idx
    ON resource_reservations (group_id, start_at);
  CREATE INDEX resource_reservations_neighborhood_status_idx
    ON resource_reservations (neighborhood_id, status);

  CREATE TABLE resource_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL,
    neighborhood_id uuid NOT NULL,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    reason resource_block_reason NOT NULL,
    reason_text text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX resource_blocks_resource_start_idx
    ON resource_blocks (resource_id, start_at);

  CREATE TABLE help_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    article_slug text NOT NULL,
    response help_feedback_response NOT NULL,
    comment text,
    locale text NOT NULL DEFAULT 'es',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX help_feedback_user_article_unique
    ON help_feedback (user_id, article_slug);
  CREATE INDEX help_feedback_article_slug_idx
    ON help_feedback (article_slug);

  CREATE TABLE help_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    event_name text NOT NULL,
    locale text NOT NULL DEFAULT 'es',
    screen_key text,
    article_slug text,
    source text,
    query text,
    result_count integer,
    metadata text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX help_events_user_created_at_idx
    ON help_events (user_id, created_at);
  CREATE INDEX help_events_event_name_idx
    ON help_events (event_name);
  CREATE INDEX help_events_article_slug_idx
    ON help_events (article_slug);
`);

const adapter = mem.adapters.createPg();
const pool = new adapter.Pool();
export const testDb = drizzle(
  async (query, params) => {
    const result = await pool.query(query, params);
    return {
      rows: result.rows.map((row: unknown[] | Record<string, unknown>) =>
        Array.isArray(row) ? row : Object.values(row as Record<string, unknown>)
      ),
    };
  },
  { schema }
);

Object.assign(testDb, {
  async transaction<T>(callback: (tx: typeof testDb) => Promise<T>) {
    return callback(testDb);
  },
});

let initialized = false;

export async function ensureTestDatabase() {
  if (initialized) {
    return;
  }
  initialized = true;
}

export async function resetTestDatabase() {
  await testDb.delete(schema.helpEvents);
  await testDb.delete(schema.helpFeedback);
  await testDb.delete(schema.resourceBlocks);
  await testDb.delete(schema.resourceReservations);
  await testDb.delete(schema.resourceRules);
  await testDb.delete(schema.resourceAvailabilityWindows);
  await testDb.delete(schema.resources);
  await testDb.delete(schema.fundPaymentAllocations);
  await testDb.delete(schema.fundMovements);
  await testDb.delete(schema.fundPaymentSubmissions);
  await testDb.delete(schema.fundGroupCharges);
  await testDb.delete(schema.fundChargePeriods);
  await testDb.delete(schema.fundChargeTemplates);
  await testDb.delete(schema.neighborhoodFunds);
  await testDb.delete(schema.votes);
  await testDb.delete(schema.pollOptions);
  await testDb.delete(schema.polls);
  await testDb.delete(schema.fundraisingContributions);
  await testDb.delete(schema.fundraisingCampaigns);
  await testDb.delete(schema.groupMemberships);
  await testDb.delete(schema.groups);
  await testDb.delete(schema.neighborhoodMemberships);
  await testDb.delete(schema.neighborhoods);
  await testDb.delete(schema.sessions);
  await testDb.delete(schema.users);
}

export async function closeTestDatabase() {
  initialized = false;
}
