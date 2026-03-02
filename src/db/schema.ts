import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "platform_admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const neighborhoodStatusEnum = pgEnum("neighborhood_status", [
  "active",
  "inactive",
]);
export const neighborhoodRoleEnum = pgEnum("neighborhood_role", [
  "neighbor",
  "neighborhood_admin",
]);
export const neighborhoodMembershipStatusEnum = pgEnum(
  "neighborhood_membership_status",
  ["active", "inactive"]
);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "inactive"]);
export const pollStatusEnum = pgEnum("poll_status", ["draft", "active", "closed"]);
export const contributionMethodEnum = pgEnum("contribution_method", ["cash", "wire_transfer"]);
export const contributionStatusEnum = pgEnum("contribution_status", [
  "submitted",
  "confirmed",
  "rejected",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "open",
  "closed",
]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published"]);


export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    username: text("username"),
    image: text("image"),
    preferredLanguage: text("preferred_language").notNull().default("es"),
    role: roleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull(),
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ]
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

export const neighborhoods = pgTable(
  "neighborhoods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: neighborhoodStatusEnum("status").notNull().default("active"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("neighborhoods_slug_unique").on(sql`lower(${table.slug})`),
    index("neighborhoods_status_idx").on(table.status),
  ]
);

export const neighborhoodMemberships = pgTable(
  "neighborhood_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: neighborhoodRoleEnum("role").notNull().default("neighbor"),
    status: neighborhoodMembershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("neighborhood_memberships_neighborhood_user_unique").on(
      table.neighborhoodId,
      table.userId
    ),
    index("neighborhood_memberships_neighborhood_id_idx").on(table.neighborhoodId),
    index("neighborhood_memberships_user_id_idx").on(table.userId),
    index("neighborhood_memberships_neighborhood_role_idx").on(
      table.neighborhoodId,
      table.role
    ),
  ]
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    adminUserId: uuid("admin_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("groups_neighborhood_id_idx").on(table.neighborhoodId),
    index("groups_admin_user_id_idx").on(table.adminUserId),
  ]
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull(),
    userId: uuid("user_id").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("group_memberships_group_user_unique").on(
      table.groupId,
      table.userId
    ),
    index("group_memberships_group_id_idx").on(table.groupId),
    index("group_memberships_user_id_idx").on(table.userId),
  ]
);

export const polls = pgTable(
  "polls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: pollStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("polls_neighborhood_id_idx").on(table.neighborhoodId)]
);

export const pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("poll_options_poll_id_idx").on(table.pollId)]
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id").notNull(),
    groupId: uuid("group_id").notNull(),
    optionId: uuid("option_id").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("votes_poll_group_unique").on(table.pollId, table.groupId),
    index("votes_poll_id_idx").on(table.pollId),
    index("votes_group_id_idx").on(table.groupId),
  ]
);

export const fundraisingCampaigns = pgTable(
  "fundraising_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    goalAmount: numeric("goal_amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date"),
    status: campaignStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("fundraising_campaigns_neighborhood_id_idx").on(table.neighborhoodId)]
);

export const fundraisingContributions = pgTable(
  "fundraising_contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").notNull(),
    groupId: uuid("group_id").notNull(),
    submittedBy: uuid("submitted_by").notNull(),
    method: contributionMethodEnum("method").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    wireReference: text("wire_reference"),
    wireDate: date("wire_date"),
    wireAmount: numeric("wire_amount", { precision: 12, scale: 2 }),
    status: contributionStatusEnum("status").notNull().default("submitted"),
    confirmedBy: uuid("confirmed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fundraising_contributions_campaign_id_idx").on(table.campaignId),
    index("fundraising_contributions_group_id_idx").on(table.groupId),
  ]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_neighborhood_id_idx").on(table.neighborhoodId),
    index("events_starts_at_idx").on(table.startsAt),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: postStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("posts_neighborhood_id_idx").on(table.neighborhoodId),
    index("posts_status_idx").on(table.status),
    index("posts_published_at_idx").on(table.publishedAt),
  ]
);
