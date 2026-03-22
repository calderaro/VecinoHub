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
export const groupRoleEnum = pgEnum("group_role", ["group_member", "group_admin"]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "inactive"]);
export const groupInviteStatusEnum = pgEnum("group_invite_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
]);
export const groupAccessRequestStatusEnum = pgEnum("group_access_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
]);
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
export const fundStatusEnum = pgEnum("fund_status", ["active", "archived"]);
export const fundTemplateStatusEnum = pgEnum("fund_template_status", [
  "active",
  "paused",
  "archived",
]);
export const fundChargeFrequencyEnum = pgEnum("fund_charge_frequency", [
  "monthly",
  "quarterly",
  "annual",
  "one_off",
]);
export const fundChargePeriodStatusEnum = pgEnum("fund_charge_period_status", [
  "open",
  "closed",
  "cancelled",
]);
export const fundGroupChargeStatusEnum = pgEnum("fund_group_charge_status", [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "waived",
]);
export const fundPaymentStatusEnum = pgEnum("fund_payment_status", [
  "submitted",
  "confirmed",
  "rejected",
]);
export const fundPaymentMethodEnum = pgEnum("fund_payment_method", [
  "cash",
  "wire_transfer",
]);
export const fundMovementTypeEnum = pgEnum("fund_movement_type", [
  "opening_balance",
  "payment",
  "expense",
  "manual_income",
  "adjustment",
  "reversal",
]);
export const fundEntrySideEnum = pgEnum("fund_entry_side", ["credit", "debit"]);
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("groups_neighborhood_id_idx").on(table.neighborhoodId)]
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: groupRoleEnum("role").notNull().default("group_member"),
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
    index("group_memberships_group_role_idx").on(table.groupId, table.role),
  ]
);

export const groupInvites = pgTable(
  "group_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    email: text("email").notNull(),
    role: groupRoleEnum("role").notNull().default("group_member"),
    status: groupInviteStatusEnum("status").notNull().default("pending"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by").notNull(),
    respondedBy: uuid("responded_by"),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("group_invites_token_hash_unique").on(table.tokenHash),
    uniqueIndex("group_invites_pending_group_email_unique")
      .on(table.groupId, sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'::group_invite_status`),
    index("group_invites_group_status_idx").on(table.groupId, table.status),
    index("group_invites_neighborhood_status_idx").on(
      table.neighborhoodId,
      table.status
    ),
    index("group_invites_email_status_idx").on(sql`lower(${table.email})`, table.status),
    index("group_invites_expires_at_idx").on(table.expiresAt),
  ]
);

export const groupAccessRequests = pgTable(
  "group_access_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    requestedBy: uuid("requested_by").notNull(),
    status: groupAccessRequestStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("group_access_requests_pending_group_user_unique")
      .on(table.groupId, table.requestedBy)
      .where(sql`${table.status} = 'pending'::group_access_request_status`),
    index("group_access_requests_group_status_idx").on(table.groupId, table.status),
    index("group_access_requests_neighborhood_status_idx").on(
      table.neighborhoodId,
      table.status
    ),
    index("group_access_requests_requested_by_status_idx").on(
      table.requestedBy,
      table.status
    ),
    index("group_access_requests_expires_at_idx").on(table.expiresAt),
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

export const neighborhoodFunds = pgTable(
  "neighborhood_funds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    currencyCode: text("currency_code").notNull().default("MXN"),
    status: fundStatusEnum("status").notNull().default("active"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("neighborhood_funds_neighborhood_id_idx").on(table.neighborhoodId),
    uniqueIndex("neighborhood_funds_neighborhood_name_unique").on(
      table.neighborhoodId,
      sql`lower(${table.name})`
    ),
  ]
);

export const fundChargeTemplates = pgTable(
  "fund_charge_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fundId: uuid("fund_id").notNull(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: fundTemplateStatusEnum("status").notNull().default("active"),
    frequency: fundChargeFrequencyEnum("frequency").notNull(),
    defaultAmount: numeric("default_amount", { precision: 12, scale: 2 }).notNull(),
    dueDayOfMonth: integer("due_day_of_month"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fund_charge_templates_fund_id_idx").on(table.fundId),
    index("fund_charge_templates_neighborhood_id_idx").on(table.neighborhoodId),
  ]
);

export const fundChargePeriods = pgTable(
  "fund_charge_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fundId: uuid("fund_id").notNull(),
    templateId: uuid("template_id"),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    amountPerGroup: numeric("amount_per_group", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    status: fundChargePeriodStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fund_charge_periods_fund_id_idx").on(table.fundId),
    index("fund_charge_periods_template_id_idx").on(table.templateId),
    index("fund_charge_periods_neighborhood_id_idx").on(table.neighborhoodId),
    index("fund_charge_periods_due_date_idx").on(table.dueDate),
  ]
);

export const fundGroupCharges = pgTable(
  "fund_group_charges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    periodId: uuid("period_id").notNull(),
    groupId: uuid("group_id").notNull(),
    amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: fundGroupChargeStatusEnum("status").notNull().default("unpaid"),
    waivedBy: uuid("waived_by"),
    waivedReason: text("waived_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("fund_group_charges_period_group_unique").on(
      table.periodId,
      table.groupId
    ),
    index("fund_group_charges_period_id_idx").on(table.periodId),
    index("fund_group_charges_group_id_idx").on(table.groupId),
    index("fund_group_charges_status_idx").on(table.status),
  ]
);

export const fundPaymentSubmissions = pgTable(
  "fund_payment_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fundId: uuid("fund_id").notNull(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    groupChargeId: uuid("group_charge_id").notNull(),
    groupId: uuid("group_id").notNull(),
    submittedBy: uuid("submitted_by").notNull(),
    method: fundPaymentMethodEnum("method").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidAt: date("paid_at").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    status: fundPaymentStatusEnum("status").notNull().default("submitted"),
    confirmedBy: uuid("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fund_payment_submissions_fund_id_idx").on(table.fundId),
    index("fund_payment_submissions_neighborhood_id_idx").on(table.neighborhoodId),
    index("fund_payment_submissions_group_charge_id_idx").on(table.groupChargeId),
    index("fund_payment_submissions_group_id_idx").on(table.groupId),
    index("fund_payment_submissions_status_idx").on(table.status),
  ]
);

export const fundPaymentAllocations = pgTable(
  "fund_payment_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id").notNull(),
    groupChargeId: uuid("group_charge_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("fund_payment_allocations_payment_charge_unique").on(
      table.paymentId,
      table.groupChargeId
    ),
    index("fund_payment_allocations_payment_id_idx").on(table.paymentId),
    index("fund_payment_allocations_group_charge_id_idx").on(table.groupChargeId),
  ]
);

export const fundMovements = pgTable(
  "fund_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fundId: uuid("fund_id").notNull(),
    neighborhoodId: uuid("neighborhood_id").notNull(),
    type: fundMovementTypeEnum("type").notNull(),
    entrySide: fundEntrySideEnum("entry_side").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fund_movements_fund_id_idx").on(table.fundId),
    index("fund_movements_neighborhood_id_idx").on(table.neighborhoodId),
    index("fund_movements_effective_at_idx").on(table.effectiveAt),
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
