import { createHash, randomBytes } from "node:crypto";

import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  groupInvites,
  groupMemberships,
  groups,
  neighborhoods,
  users,
} from "@/db/schema";
import { getAppBaseUrl, sendGroupInviteEmail } from "@/server/mail";

import { ServiceError } from "./errors";
import { requireGroupAdminOrAdmin, resolveGroupAccess } from "./guards";
import { ensureResidentNeighborhoodMembership } from "./resident-neighborhoods";
import type { ServiceContext } from "./types";
import { groupRoleSchema, idSchema } from "./validators";

const inviteExpiryDays = 14;

const inviteEmailSchema = z.string().trim().email();

const createGroupInviteSchema = z.object({
  groupId: idSchema,
  email: inviteEmailSchema,
  role: groupRoleSchema.default("group_member"),
});

const inviteIdSchema = z.object({
  inviteId: idSchema,
});

const inviteTokenSchema = z.object({
  token: z.string().trim().min(1),
});

const groupInviteListSchema = z.object({
  groupId: idSchema,
});

type InviteRecord = typeof groupInvites.$inferSelect;

function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildInviteExpiryDate(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + inviteExpiryDays);
  return expiresAt;
}

function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(token: string) {
  return `${getAppBaseUrl()}/dashboard/invites?invite=${encodeURIComponent(token)}`;
}

async function getUserProfile(userId: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      preferredLanguage: users.preferredLanguage,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return rows[0];
}

async function markExpiredInvites(whereClause: SQL<unknown> | undefined) {
  if (!whereClause) {
    return;
  }

  await db
    .update(groupInvites)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      and(
        whereClause,
        eq(groupInvites.status, "pending"),
        lt(groupInvites.expiresAt, new Date())
      )
    );
}

async function getInviteById(inviteId: string) {
  const rows = await db
    .select()
    .from(groupInvites)
    .where(eq(groupInvites.id, inviteId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Invite not found", "NOT_FOUND");
  }

  return rows[0];
}

async function expireInviteIfNeeded(invite: InviteRecord) {
  if (invite.status !== "pending" || invite.expiresAt >= new Date()) {
    return invite;
  }

  const updated = await db
    .update(groupInvites)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(eq(groupInvites.id, invite.id))
    .returning();

  return updated[0] ?? invite;
}

async function loadInviteContext(invite: InviteRecord) {
  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      neighborhoodId: groups.neighborhoodId,
      neighborhoodName: neighborhoods.name,
    })
    .from(groups)
    .innerJoin(neighborhoods, eq(neighborhoods.id, groups.neighborhoodId))
    .where(eq(groups.id, invite.groupId))
    .limit(1);

  if (!rows[0] || rows[0].neighborhoodId !== invite.neighborhoodId) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return rows[0];
}

async function ensureInviteEmailMatchesUser(ctx: ServiceContext, invite: InviteRecord) {
  const actor = await getUserProfile(ctx.user.id);
  if (normalizeInviteEmail(actor.email) !== normalizeInviteEmail(invite.email)) {
    throw new ServiceError("This invite was sent to a different email address", "FORBIDDEN");
  }

  return actor;
}

async function ensureInviteIsActionable(invite: InviteRecord) {
  const resolvedInvite = await expireInviteIfNeeded(invite);

  if (resolvedInvite.status === "expired") {
    throw new ServiceError("This invite has expired", "INVALID");
  }

  if (resolvedInvite.status !== "pending") {
    throw new ServiceError("This invite is no longer available", "INVALID");
  }

  return resolvedInvite;
}

async function getExistingUserMembership(groupId: string, email: string) {
  const rows = await db
    .select({
      userId: users.id,
      membershipStatus: groupMemberships.status,
    })
    .from(users)
    .leftJoin(
      groupMemberships,
      and(eq(groupMemberships.userId, users.id), eq(groupMemberships.groupId, groupId))
    )
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  return rows[0] ?? null;
}

export async function listMyInvites(ctx: ServiceContext) {
  const actor = await getUserProfile(ctx.user.id);
  await markExpiredInvites(sql`lower(${groupInvites.email}) = lower(${actor.email})`);

  const rows = await db
    .select({
      id: groupInvites.id,
      groupId: groupInvites.groupId,
      groupName: groups.name,
      neighborhoodId: groupInvites.neighborhoodId,
      neighborhoodName: neighborhoods.name,
      email: groupInvites.email,
      role: groupInvites.role,
      status: groupInvites.status,
      expiresAt: groupInvites.expiresAt,
      createdAt: groupInvites.createdAt,
      updatedAt: groupInvites.updatedAt,
      invitedByName: users.name,
    })
    .from(groupInvites)
    .innerJoin(groups, eq(groups.id, groupInvites.groupId))
    .innerJoin(neighborhoods, eq(neighborhoods.id, groupInvites.neighborhoodId))
    .innerJoin(users, eq(users.id, groupInvites.invitedBy))
    .where(sql`lower(${groupInvites.email}) = lower(${actor.email})`)
    .orderBy(
      asc(sql`case when ${groupInvites.status} = 'pending' then 0 else 1 end`),
      asc(groupInvites.expiresAt),
      desc(groupInvites.updatedAt)
    );

  return {
    pending: rows.filter((invite) => invite.status === "pending"),
    history: rows.filter((invite) => invite.status !== "pending"),
  };
}

export async function listGroupInvites(
  ctx: ServiceContext,
  input: z.input<typeof groupInviteListSchema>
) {
  const { groupId } = groupInviteListSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);

  await markExpiredInvites(eq(groupInvites.groupId, groupId));

  const rows = await db
    .select({
      id: groupInvites.id,
      email: groupInvites.email,
      role: groupInvites.role,
      status: groupInvites.status,
      expiresAt: groupInvites.expiresAt,
      createdAt: groupInvites.createdAt,
      lastSentAt: groupInvites.lastSentAt,
      invitedByName: users.name,
    })
    .from(groupInvites)
    .innerJoin(users, eq(users.id, groupInvites.invitedBy))
    .where(eq(groupInvites.groupId, groupId))
    .orderBy(
      asc(sql`case when ${groupInvites.status} = 'pending' then 0 else 1 end`),
      asc(groupInvites.expiresAt),
      desc(groupInvites.updatedAt)
    );

  return {
    pending: rows.filter((invite) => invite.status === "pending"),
    history: rows.filter((invite) => invite.status !== "pending"),
  };
}

export async function getInviteByTokenForSession(
  ctx: ServiceContext,
  input: z.input<typeof inviteTokenSchema>
) {
  const { token } = inviteTokenSchema.parse(input);
  const actor = await getUserProfile(ctx.user.id);
  const tokenHash = hashInviteToken(token);

  const rows = await db
    .select({
      id: groupInvites.id,
      email: groupInvites.email,
    })
    .from(groupInvites)
    .where(eq(groupInvites.tokenHash, tokenHash))
    .limit(1);

  if (!rows[0]) {
    return { kind: "not_found" as const };
  }

  if (normalizeInviteEmail(rows[0].email) !== normalizeInviteEmail(actor.email)) {
    return { kind: "mismatch" as const };
  }

  return {
    kind: "match" as const,
    inviteId: rows[0].id,
  };
}

export async function createGroupInvite(
  ctx: ServiceContext,
  input: z.input<typeof createGroupInviteSchema>
) {
  const { groupId, email, role } = createGroupInviteSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);

  const actor = await getUserProfile(ctx.user.id);
  const group = await resolveGroupAccess(ctx, groupId);
  const inviteEmail = normalizeInviteEmail(email);

  await markExpiredInvites(
    and(eq(groupInvites.groupId, groupId), sql`lower(${groupInvites.email}) = lower(${inviteEmail})`)
  );

  const existingUserMembership = await getExistingUserMembership(groupId, inviteEmail);
  if (existingUserMembership?.membershipStatus === "active") {
    throw new ServiceError("User is already an active group member", "INVALID");
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = buildInviteExpiryDate();

  const existingPending = await db
    .select()
    .from(groupInvites)
    .where(
      and(
        eq(groupInvites.groupId, groupId),
        eq(groupInvites.status, "pending"),
        sql`lower(${groupInvites.email}) = lower(${inviteEmail})`
      )
    )
    .limit(1);

  const invite = existingPending[0]
    ? (
        await db
          .update(groupInvites)
          .set({
            role,
            tokenHash,
            lastSentAt: new Date(),
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(groupInvites.id, existingPending[0].id))
          .returning()
      )[0]
    : (
        await db
          .insert(groupInvites)
          .values({
            groupId,
            neighborhoodId: group.neighborhoodId,
            email: inviteEmail,
            role,
            tokenHash,
            invitedBy: ctx.user.id,
            lastSentAt: new Date(),
            expiresAt,
          })
          .returning()
      )[0];

  if (!invite) {
    throw new ServiceError("Unable to create invite", "INVALID");
  }

  const inviteContext = await loadInviteContext(invite);

  try {
    await sendGroupInviteEmail({
      email: inviteEmail,
      groupName: inviteContext.groupName,
      neighborhoodName: inviteContext.neighborhoodName,
      inviterName: actor.name,
      role,
      inviteUrl: buildInviteUrl(token),
      expiresAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send invite email. Please try again.";
    throw new ServiceError(message, "INVALID");
  }

  return {
    id: invite.id,
    groupId: invite.groupId,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
  };
}

export async function resendGroupInvite(
  ctx: ServiceContext,
  input: z.input<typeof inviteIdSchema>
) {
  const { inviteId } = inviteIdSchema.parse(input);
  const actor = await getUserProfile(ctx.user.id);
  const existingInvite = await getInviteById(inviteId);
  await requireGroupAdminOrAdmin(ctx, existingInvite.groupId);

  const invite =
    existingInvite.status === "expired"
      ? existingInvite
      : await expireInviteIfNeeded(existingInvite);

  if (!["pending", "expired"].includes(invite.status)) {
    throw new ServiceError("This invite cannot be resent", "INVALID");
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = buildInviteExpiryDate();

  const updated = await db
    .update(groupInvites)
    .set({
      status: "pending",
      tokenHash,
      lastSentAt: new Date(),
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(groupInvites.id, invite.id))
    .returning();

  const resolvedInvite = updated[0];
  if (!resolvedInvite) {
    throw new ServiceError("Invite not found", "NOT_FOUND");
  }

  const inviteContext = await loadInviteContext(resolvedInvite);

  try {
    await sendGroupInviteEmail({
      email: resolvedInvite.email,
      groupName: inviteContext.groupName,
      neighborhoodName: inviteContext.neighborhoodName,
      inviterName: actor.name,
      role: resolvedInvite.role,
      inviteUrl: buildInviteUrl(token),
      expiresAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send invite email. Please try again.";
    throw new ServiceError(message, "INVALID");
  }

  return {
    id: resolvedInvite.id,
    status: resolvedInvite.status,
    expiresAt: resolvedInvite.expiresAt,
  };
}

export async function cancelGroupInvite(
  ctx: ServiceContext,
  input: z.input<typeof inviteIdSchema>
) {
  const { inviteId } = inviteIdSchema.parse(input);
  const invite = await getInviteById(inviteId);
  await requireGroupAdminOrAdmin(ctx, invite.groupId);

  const actionableInvite = await ensureInviteIsActionable(invite);

  const updated = await db
    .update(groupInvites)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groupInvites.id, actionableInvite.id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Invite not found", "NOT_FOUND");
  }

  return updated[0];
}

export async function acceptGroupInvite(
  ctx: ServiceContext,
  input: z.input<typeof inviteIdSchema>
) {
  const { inviteId } = inviteIdSchema.parse(input);
  const invite = await getInviteById(inviteId);
  const actionableInvite = await ensureInviteIsActionable(invite);
  await ensureInviteEmailMatchesUser(ctx, actionableInvite);
  const inviteContext = await loadInviteContext(actionableInvite);

  await db.transaction(async (tx) => {
    const existingGroupMembership = await tx
      .select({
        id: groupMemberships.id,
        role: groupMemberships.role,
        status: groupMemberships.status,
      })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, actionableInvite.groupId),
          eq(groupMemberships.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!existingGroupMembership[0]) {
      await tx.insert(groupMemberships).values({
        groupId: actionableInvite.groupId,
        userId: ctx.user.id,
        role: actionableInvite.role,
        status: "active",
      });
    } else {
      await tx
        .update(groupMemberships)
        .set({
          role:
            existingGroupMembership[0].status === "active"
              ? existingGroupMembership[0].role
              : actionableInvite.role,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(groupMemberships.id, existingGroupMembership[0].id));
    }

    await ensureResidentNeighborhoodMembership(
      tx,
      actionableInvite.neighborhoodId,
      ctx.user.id
    );

    await tx
      .update(groupInvites)
      .set({
        status: "accepted",
        respondedBy: ctx.user.id,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupInvites.id, actionableInvite.id));
  });

  return {
    inviteId: actionableInvite.id,
    groupId: inviteContext.groupId,
    status: "accepted" as const,
  };
}

export async function rejectGroupInvite(
  ctx: ServiceContext,
  input: z.input<typeof inviteIdSchema>
) {
  const { inviteId } = inviteIdSchema.parse(input);
  const invite = await getInviteById(inviteId);
  const actionableInvite = await ensureInviteIsActionable(invite);
  await ensureInviteEmailMatchesUser(ctx, actionableInvite);

  const updated = await db
    .update(groupInvites)
    .set({
      status: "rejected",
      respondedBy: ctx.user.id,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groupInvites.id, actionableInvite.id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Invite not found", "NOT_FOUND");
  }

  return {
    inviteId: updated[0].id,
    status: updated[0].status,
  };
}
