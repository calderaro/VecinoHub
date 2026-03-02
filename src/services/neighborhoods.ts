import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { neighborhoodMemberships, neighborhoods, users } from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  listNeighborhoodIdsForUser,
  requireNeighborhoodAdminOrPlatform,
  requireNeighborhoodMember,
  requirePlatformAdmin,
} from "./guards";
import type { ServiceContext } from "./types";
import {
  idSchema,
  neighborhoodRoleSchema,
  neighborhoodStatusSchema,
  statusSchema,
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
    .innerJoin(
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
      myRole: row.role,
      myStatus: row.membershipStatus,
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
  adminUserId: idSchema.optional(),
});

export async function createNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof createNeighborhoodSchema>
) {
  requirePlatformAdmin(ctx);
  const { name, slug, adminUserId } = createNeighborhoodSchema.parse(input);

  return db.transaction(async (tx) => {
    const createdRows = await tx
      .insert(neighborhoods)
      .values({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
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
    status: neighborhoodStatusSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined || value.status !== undefined, {
    message: "At least one field is required.",
  });

export async function updateNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof updateNeighborhoodSchema>
) {
  requirePlatformAdmin(ctx);
  const { neighborhoodId, name, slug, status } = updateNeighborhoodSchema.parse(input);

  const updated = await db
    .update(neighborhoods)
    .set({
      name: name?.trim(),
      slug: slug?.trim().toLowerCase(),
      status,
    })
    .where(eq(neighborhoods.id, neighborhoodId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  return updated[0];
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

  const existing = await db
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
    const created = await db
      .insert(neighborhoodMemberships)
      .values({
        neighborhoodId,
        userId,
        role,
        status: "active",
      })
      .returning();

    return created[0];
  }

  const updated = await db
    .update(neighborhoodMemberships)
    .set({ role, status: "active" })
    .where(eq(neighborhoodMemberships.id, existing[0].id))
    .returning();

  return updated[0];
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

  const updated = await db
    .update(neighborhoodMemberships)
    .set({ status })
    .where(
      and(
        eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
        eq(neighborhoodMemberships.userId, userId)
      )
    )
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Neighborhood membership not found", "NOT_FOUND");
  }

  return updated[0];
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
    .select()
    .from(neighborhoods)
    .where(eq(neighborhoods.id, neighborhoodId))
    .limit(1);

  if (!row[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  return row[0];
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
