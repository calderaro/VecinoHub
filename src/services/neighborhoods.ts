import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  events,
  fundraisingCampaigns,
  fundraisingContributions,
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  pollOptions,
  polls,
  posts,
  users,
  votes,
} from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  listNeighborhoodIdsForUser,
  requireNeighborhoodAdminOrPlatform,
  requireNeighborhoodMember,
  requirePlatformAdmin,
} from "./guards";
import { syncResidentNeighborhoodMembership } from "./resident-neighborhoods";
import type { ServiceContext } from "./types";
import {
  idSchema,
  neighborhoodRoleSchema,
  neighborhoodStatusSchema,
  statusSchema,
  timeZoneSchema,
} from "./validators";

const listNeighborhoodsSchema = z.object({
  query: z.string().optional(),
  status: neighborhoodStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export async function listNeighborhoodsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodsSchema>
) {
  const { query, status, limit, offset } = listNeighborhoodsSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(ilike(neighborhoods.name, search), ilike(neighborhoods.slug, search))
    : undefined;
  const statusFilter = status ? eq(neighborhoods.status, status) : undefined;
  const combinedFilter =
    searchFilter && statusFilter
      ? and(searchFilter, statusFilter)
      : (searchFilter ?? statusFilter);

  if (isPlatformAdmin(ctx)) {
    const rows = await db
      .select({
        neighborhood: neighborhoods,
        creatorName: users.name,
      })
      .from(neighborhoods)
      .leftJoin(users, eq(neighborhoods.createdBy, users.id))
      .where(combinedFilter)
      .orderBy(desc(neighborhoods.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ value: count() })
      .from(neighborhoods)
      .where(combinedFilter);

    return {
      items: rows.map((row) => ({
        ...row.neighborhood,
        creatorName: row.creatorName,
      })),
      total: Number(totalResult[0]?.value ?? 0),
    };
  }

  const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
  if (!neighborhoodIds || neighborhoodIds.length === 0) {
    return { items: [], total: 0 };
  }

  const membershipFilter = inArray(neighborhoods.id, neighborhoodIds);
  const finalFilter = combinedFilter ? and(membershipFilter, combinedFilter) : membershipFilter;

  const rows = await db
    .select({
      neighborhood: neighborhoods,
      role: neighborhoodMemberships.role,
      membershipStatus: neighborhoodMemberships.status,
    })
    .from(neighborhoods)
    .leftJoin(
      neighborhoodMemberships,
      and(
        eq(neighborhoodMemberships.neighborhoodId, neighborhoods.id),
        eq(neighborhoodMemberships.userId, ctx.user.id)
      )
    )
    .where(finalFilter)
    .orderBy(desc(neighborhoods.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(neighborhoods)
    .where(finalFilter);

  return {
    items: rows.map((row) => ({
      ...row.neighborhood,
      myRole: row.role ?? "neighbor",
      myStatus: row.membershipStatus ?? "active",
    })),
    total: Number(totalResult[0]?.value ?? 0),
  };
}

const createNeighborhoodSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  timeZone: timeZoneSchema.default("America/Mexico_City"),
  adminUserId: idSchema.optional(),
});

export async function createNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof createNeighborhoodSchema>
) {
  requirePlatformAdmin(ctx);
  const { name, slug, timeZone, adminUserId } = createNeighborhoodSchema.parse(input);

  return db.transaction(async (tx) => {
    const createdRows = await tx
      .insert(neighborhoods)
      .values({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        timeZone,
        status: "active",
        createdBy: ctx.user.id,
      })
      .returning();

    const neighborhood = createdRows[0];
    if (!neighborhood) {
      throw new ServiceError("Failed to create neighborhood", "INVALID");
    }

    const membershipRows = [
      {
        neighborhoodId: neighborhood.id,
        userId: ctx.user.id,
        role: "neighborhood_admin" as const,
        status: "active" as const,
      },
    ];

    if (adminUserId && adminUserId !== ctx.user.id) {
      membershipRows.push({
        neighborhoodId: neighborhood.id,
        userId: adminUserId,
        role: "neighborhood_admin",
        status: "active",
      });
    }

    await tx
      .insert(neighborhoodMemberships)
      .values(membershipRows)
      .onConflictDoNothing();

    return neighborhood;
  });
}

const updateNeighborhoodSchema = z
  .object({
    neighborhoodId: idSchema,
    name: z.string().min(1).optional(),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    timeZone: timeZoneSchema.optional(),
    status: neighborhoodStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.timeZone !== undefined ||
      value.status !== undefined,
    {
      message: "At least one field is required.",
    }
  );

export async function updateNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof updateNeighborhoodSchema>
) {
  requirePlatformAdmin(ctx);
  const { neighborhoodId, name, slug, timeZone, status } = updateNeighborhoodSchema.parse(input);

  const updated = await db
    .update(neighborhoods)
    .set({
      name: name?.trim(),
      slug: slug?.trim().toLowerCase(),
      timeZone,
      status,
    })
    .where(eq(neighborhoods.id, neighborhoodId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  return updated[0];
}

const removeNeighborhoodSchema = z.object({
  neighborhoodId: idSchema,
});

export async function removeNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof removeNeighborhoodSchema>
) {
  requirePlatformAdmin(ctx);
  const { neighborhoodId } = removeNeighborhoodSchema.parse(input);

  const existing = await db
    .select({ id: neighborhoods.id })
    .from(neighborhoods)
    .where(eq(neighborhoods.id, neighborhoodId))
    .limit(1);

  if (!existing[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    const [pollRows, campaignRows, groupRows] = await Promise.all([
      tx.select({ id: polls.id }).from(polls).where(eq(polls.neighborhoodId, neighborhoodId)),
      tx
        .select({ id: fundraisingCampaigns.id })
        .from(fundraisingCampaigns)
        .where(eq(fundraisingCampaigns.neighborhoodId, neighborhoodId)),
      tx.select({ id: groups.id }).from(groups).where(eq(groups.neighborhoodId, neighborhoodId)),
    ]);

    const pollIds = pollRows.map((row) => row.id);
    const campaignIds = campaignRows.map((row) => row.id);
    const groupIds = groupRows.map((row) => row.id);

    if (pollIds.length > 0) {
      await tx.delete(votes).where(inArray(votes.pollId, pollIds));
      await tx.delete(pollOptions).where(inArray(pollOptions.pollId, pollIds));
      await tx.delete(polls).where(inArray(polls.id, pollIds));
    }

    if (campaignIds.length > 0) {
      await tx
        .delete(fundraisingContributions)
        .where(inArray(fundraisingContributions.campaignId, campaignIds));
      await tx
        .delete(fundraisingCampaigns)
        .where(inArray(fundraisingCampaigns.id, campaignIds));
    }

    if (groupIds.length > 0) {
      await tx.delete(votes).where(inArray(votes.groupId, groupIds));
      await tx
        .delete(fundraisingContributions)
        .where(inArray(fundraisingContributions.groupId, groupIds));
      await tx.delete(groupMemberships).where(inArray(groupMemberships.groupId, groupIds));
      await tx.delete(groups).where(inArray(groups.id, groupIds));
    }

    await tx.delete(events).where(eq(events.neighborhoodId, neighborhoodId));
    await tx.delete(posts).where(eq(posts.neighborhoodId, neighborhoodId));
    await tx
      .delete(neighborhoodMemberships)
      .where(eq(neighborhoodMemberships.neighborhoodId, neighborhoodId));
    await tx.delete(neighborhoods).where(eq(neighborhoods.id, neighborhoodId));
  });

  return { neighborhoodId };
}

const setMembershipRoleSchema = z.object({
  neighborhoodId: idSchema,
  userId: idSchema,
  role: neighborhoodRoleSchema,
});

export async function setNeighborhoodMemberRole(
  ctx: ServiceContext,
  input: z.input<typeof setMembershipRoleSchema>
) {
  const { neighborhoodId, userId, role } = setMembershipRoleSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: neighborhoodMemberships.id })
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!existing[0]) {
      await tx.insert(neighborhoodMemberships).values({
        neighborhoodId,
        userId,
        role,
        status: "active",
      });
    } else {
      await tx
        .update(neighborhoodMemberships)
        .set({ role, status: "active", updatedAt: new Date() })
        .where(eq(neighborhoodMemberships.id, existing[0].id));
    }

    if (role === "neighbor") {
      await syncResidentNeighborhoodMembership(tx, neighborhoodId, userId);
    }

    const finalRows = await tx
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .limit(1);

    return finalRows[0];
  });
}

const addMemberByEmailSchema = z.object({
  neighborhoodId: idSchema,
  email: z.string().trim().email(),
  role: neighborhoodRoleSchema.default("neighbor"),
});

export async function addNeighborhoodMemberByEmail(
  ctx: ServiceContext,
  input: z.input<typeof addMemberByEmailSchema>
) {
  const { neighborhoodId, email, role } = addMemberByEmailSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      image: users.image,
      role: users.role,
    })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  const user = userRows[0];
  if (!user) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  await setNeighborhoodMemberRole(ctx, {
    neighborhoodId,
    userId: user.id,
    role,
  });

  const membershipRows = await db
    .select({
      membershipRole: neighborhoodMemberships.role,
      membershipStatus: neighborhoodMemberships.status,
      createdAt: neighborhoodMemberships.createdAt,
    })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
        eq(neighborhoodMemberships.userId, user.id)
      )
    )
    .limit(1);

  const membership = membershipRows[0];
  if (!membership) {
    throw new ServiceError("Neighborhood membership not found", "NOT_FOUND");
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    image: user.image,
    systemRole: user.role,
    membershipRole: membership.membershipRole,
    membershipStatus: membership.membershipStatus,
    createdAt: membership.createdAt,
  };
}

const updateMembershipStatusSchema = z.object({
  neighborhoodId: idSchema,
  userId: idSchema,
  status: statusSchema,
});

export async function updateNeighborhoodMembershipStatus(
  ctx: ServiceContext,
  input: z.input<typeof updateMembershipStatusSchema>
) {
  const { neighborhoodId, userId, status } = updateMembershipStatusSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const updated = await db.transaction(async (tx) => {
    const membershipRows = await tx
      .update(neighborhoodMemberships)
      .set({ status })
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .returning();

    if (membershipRows[0] && status === "inactive") {
      const scopedGroups = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.neighborhoodId, neighborhoodId));

      const groupIds = scopedGroups.map((group) => group.id);
      if (groupIds.length > 0) {
        await tx
          .update(groupMemberships)
          .set({
            status: "inactive",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupMemberships.userId, userId),
              inArray(groupMemberships.groupId, groupIds)
            )
          );
      }
    }

    if (membershipRows[0]) {
      await syncResidentNeighborhoodMembership(tx, neighborhoodId, userId);
    }

    return tx
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .limit(1);
  });

  if (!updated[0]) {
    throw new ServiceError("Neighborhood membership not found", "NOT_FOUND");
  }

  return updated[0];
}

const updateNeighborhoodMemberSchema = z
  .object({
    neighborhoodId: idSchema,
    userId: idSchema,
    role: neighborhoodRoleSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one field is required.",
  });

export async function updateNeighborhoodMember(
  ctx: ServiceContext,
  input: z.input<typeof updateNeighborhoodMemberSchema>
) {
  const { neighborhoodId, userId, role, status } = updateNeighborhoodMemberSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const updated = await db.transaction(async (tx) => {
    const membershipRows = await tx
      .update(neighborhoodMemberships)
      .set({
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      })
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .returning();

    if (membershipRows[0] && status === "inactive") {
      const scopedGroups = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.neighborhoodId, neighborhoodId));

      const groupIds = scopedGroups.map((group) => group.id);
      if (groupIds.length > 0) {
        await tx
          .update(groupMemberships)
          .set({
            status: "inactive",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupMemberships.userId, userId),
              inArray(groupMemberships.groupId, groupIds)
            )
          );
      }
    }

    if (membershipRows[0]) {
      await syncResidentNeighborhoodMembership(tx, neighborhoodId, userId);
    }

    return tx
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .limit(1);
  });

  if (!updated[0]) {
    throw new ServiceError("Neighborhood membership not found", "NOT_FOUND");
  }

  return updated[0];
}

const removeNeighborhoodMemberSchema = z.object({
  neighborhoodId: idSchema,
  userId: idSchema,
});

export async function removeNeighborhoodMember(
  ctx: ServiceContext,
  input: z.input<typeof removeNeighborhoodMemberSchema>
) {
  const { neighborhoodId, userId } = removeNeighborhoodMemberSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const deleted = await db.transaction(async (tx) => {
    const deletedRows = await tx
      .delete(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, userId)
        )
      )
      .returning();

    if (deletedRows[0]) {
      const scopedGroups = await tx
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.neighborhoodId, neighborhoodId));

      const groupIds = scopedGroups.map((group) => group.id);
      if (groupIds.length > 0) {
        await tx
          .update(groupMemberships)
          .set({
            status: "inactive",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(groupMemberships.userId, userId),
              inArray(groupMemberships.groupId, groupIds)
            )
          );
      }
    }

    return deletedRows;
  });

  if (!deleted[0]) {
    throw new ServiceError("Neighborhood membership not found", "NOT_FOUND");
  }

  return deleted[0];
}

const listMembersSchema = z.object({
  neighborhoodId: idSchema,
  query: z.string().optional(),
  role: neighborhoodRoleSchema.optional(),
  status: statusSchema.optional(),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export async function listNeighborhoodMembersPaged(
  ctx: ServiceContext,
  input: z.input<typeof listMembersSchema>
) {
  const { neighborhoodId, query, role, status, limit, offset } =
    listMembersSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(ilike(users.name, search), ilike(users.email, search), ilike(users.username, search))
    : undefined;
  const roleFilter = role ? eq(neighborhoodMemberships.role, role) : undefined;
  const statusFilter = status ? eq(neighborhoodMemberships.status, status) : undefined;
  const combinedFilter =
    searchFilter && roleFilter && statusFilter
      ? and(searchFilter, roleFilter, statusFilter)
      : searchFilter && roleFilter
        ? and(searchFilter, roleFilter)
        : searchFilter && statusFilter
          ? and(searchFilter, statusFilter)
          : roleFilter && statusFilter
            ? and(roleFilter, statusFilter)
            : (searchFilter ?? roleFilter ?? statusFilter);
  const scopedFilter = combinedFilter
    ? and(eq(neighborhoodMemberships.neighborhoodId, neighborhoodId), combinedFilter)
    : eq(neighborhoodMemberships.neighborhoodId, neighborhoodId);

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      image: users.image,
      systemRole: users.role,
      membershipRole: neighborhoodMemberships.role,
      membershipStatus: neighborhoodMemberships.status,
      createdAt: neighborhoodMemberships.createdAt,
    })
    .from(neighborhoodMemberships)
    .innerJoin(users, eq(neighborhoodMemberships.userId, users.id))
    .where(scopedFilter)
    .orderBy(desc(neighborhoodMemberships.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(neighborhoodMemberships)
    .innerJoin(users, eq(neighborhoodMemberships.userId, users.id))
    .where(scopedFilter);

  return {
    items: rows,
    total: Number(totalResult[0]?.value ?? 0),
  };
}

const getNeighborhoodSchema = z.object({
  neighborhoodId: idSchema,
});

export async function getNeighborhoodById(
  ctx: ServiceContext,
  input: z.input<typeof getNeighborhoodSchema>
) {
  const { neighborhoodId } = getNeighborhoodSchema.parse(input);
  if (!isPlatformAdmin(ctx)) {
    await requireNeighborhoodMember(ctx, neighborhoodId);
  }

  const row = await db
    .select({
      neighborhood: neighborhoods,
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(neighborhoods)
    .leftJoin(users, eq(neighborhoods.createdBy, users.id))
    .where(eq(neighborhoods.id, neighborhoodId))
    .limit(1);

  if (!row[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  return {
    ...row[0].neighborhood,
    creatorName: row[0].creatorName,
    creatorEmail: row[0].creatorEmail,
  };
}

const slugSchema = z.object({ slug: z.string().trim().min(1) });

export async function getNeighborhoodBySlug(
  ctx: ServiceContext,
  input: z.input<typeof slugSchema>
) {
  const { slug } = slugSchema.parse(input);
  const row = await db
    .select()
    .from(neighborhoods)
    .where(sql`lower(${neighborhoods.slug}) = lower(${slug})`)
    .limit(1);

  if (!row[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  if (!isPlatformAdmin(ctx)) {
    await requireNeighborhoodMember(ctx, row[0].id);
  }

  return row[0];
}

export async function hasNeighborhoodAdminRole(ctx: ServiceContext) {
  if (isPlatformAdmin(ctx)) {
    return true;
  }

  const membership = await db
    .select({ id: neighborhoodMemberships.id })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.role, "neighborhood_admin"),
        eq(neighborhoodMemberships.status, "active")
      )
    )
    .limit(1);

  return Boolean(membership[0]);
}

export async function listNeighborhoodAdminOptions(ctx: ServiceContext) {
  if (isPlatformAdmin(ctx)) {
    return db
      .select({
        id: neighborhoods.id,
        name: neighborhoods.name,
      })
      .from(neighborhoods)
      .where(eq(neighborhoods.status, "active"))
      .orderBy(asc(neighborhoods.name));
  }

  return db
    .select({
      id: neighborhoods.id,
      name: neighborhoods.name,
    })
    .from(neighborhoodMemberships)
    .innerJoin(neighborhoods, eq(neighborhoodMemberships.neighborhoodId, neighborhoods.id))
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.role, "neighborhood_admin"),
        eq(neighborhoodMemberships.status, "active"),
        eq(neighborhoods.status, "active")
      )
    )
    .orderBy(asc(neighborhoods.name));
}

const setActiveNeighborhoodContextSchema = z.object({
  neighborhoodId: idSchema.nullable().optional(),
});

export async function setActiveNeighborhoodContext(
  ctx: ServiceContext,
  input: z.input<typeof setActiveNeighborhoodContextSchema>
) {
  const { neighborhoodId } = setActiveNeighborhoodContextSchema.parse(input);
  if (!neighborhoodId) {
    return { activeNeighborhoodId: null };
  }

  const neighborhood = await db
    .select({ id: neighborhoods.id })
    .from(neighborhoods)
    .where(eq(neighborhoods.id, neighborhoodId))
    .limit(1);

  if (!neighborhood[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  if (!isPlatformAdmin(ctx)) {
    await requireNeighborhoodMember(ctx, neighborhoodId);
  }

  return { activeNeighborhoodId: neighborhoodId };
}
