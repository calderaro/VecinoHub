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
  CREATE TYPE neighborhood_role AS ENUM ('neighbor', 'neighborhood_admin');
  CREATE TYPE neighborhood_membership_status AS ENUM ('active', 'inactive');
  CREATE TYPE group_role AS ENUM ('group_member', 'group_admin');
  CREATE TYPE membership_status AS ENUM ('active', 'inactive');
  CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');
  CREATE TYPE contribution_method AS ENUM ('cash', 'wire_transfer');
  CREATE TYPE contribution_status AS ENUM ('submitted', 'confirmed', 'rejected');
  CREATE TYPE campaign_status AS ENUM ('open', 'closed');

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
  await testDb.delete(schema.votes);
  await testDb.delete(schema.pollOptions);
  await testDb.delete(schema.polls);
  await testDb.delete(schema.fundraisingContributions);
  await testDb.delete(schema.fundraisingCampaigns);
  await testDb.delete(schema.groupMemberships);
  await testDb.delete(schema.groups);
  await testDb.delete(schema.neighborhoodMemberships);
  await testDb.delete(schema.sessions);
  await testDb.delete(schema.users);
}

export async function closeTestDatabase() {
  initialized = false;
}
