import "dotenv/config";
import { eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  fundraisingCampaigns,
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  polls,
  posts,
  events,
  users,
} from "@/db/schema";

const DEFAULT_NEIGHBORHOOD_NAME = "VecinoHub Neighborhood";
const DEFAULT_NEIGHBORHOOD_SLUG = "vecinohub-neighborhood";

async function ensureDefaultNeighborhood() {
  const existing = await db
    .select({ id: neighborhoods.id })
    .from(neighborhoods)
    .where(eq(neighborhoods.slug, DEFAULT_NEIGHBORHOOD_SLUG))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const fallbackCreator =
    (
      await db
        .select({ id: users.id })
        .from(users)
        .limit(1)
    )[0]?.id ?? null;

  if (!fallbackCreator) {
    throw new Error("Cannot backfill neighborhoods without at least one user.");
  }

  const created = await db
    .insert(neighborhoods)
    .values({
      name: DEFAULT_NEIGHBORHOOD_NAME,
      slug: DEFAULT_NEIGHBORHOOD_SLUG,
      status: "active",
      createdBy: fallbackCreator,
    })
    .returning({ id: neighborhoods.id });

  if (!created[0]) {
    throw new Error("Failed to create default neighborhood.");
  }

  return created[0].id;
}

async function main() {
  const defaultNeighborhoodId = await ensureDefaultNeighborhood();

  await db
    .update(users)
    .set({ role: "platform_admin" })
    .where(eq(users.role, "admin"));

  await db
    .update(groups)
    .set({ neighborhoodId: defaultNeighborhoodId })
    .where(isNull(groups.neighborhoodId));

  await db
    .update(polls)
    .set({ neighborhoodId: defaultNeighborhoodId })
    .where(isNull(polls.neighborhoodId));

  await db
    .update(fundraisingCampaigns)
    .set({ neighborhoodId: defaultNeighborhoodId })
    .where(isNull(fundraisingCampaigns.neighborhoodId));

  await db
    .update(events)
    .set({ neighborhoodId: defaultNeighborhoodId })
    .where(isNull(events.neighborhoodId));

  await db
    .update(posts)
    .set({ neighborhoodId: defaultNeighborhoodId })
    .where(isNull(posts.neighborhoodId));

  const groupMembershipUsers = await db
    .select({ userId: groupMemberships.userId })
    .from(groupMemberships);
  const uniqueUserIds = Array.from(new Set(groupMembershipUsers.map((row) => row.userId)));

  if (uniqueUserIds.length > 0) {
    await db
      .insert(neighborhoodMemberships)
      .values(
        uniqueUserIds.map((userId) => ({
          neighborhoodId: defaultNeighborhoodId,
          userId,
          role: "neighbor" as const,
          status: "active" as const,
        }))
      )
      .onConflictDoNothing();
  }

  const platformAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["platform_admin", "admin"]));

  if (platformAdmins.length > 0) {
    await db
      .insert(neighborhoodMemberships)
      .values(
        platformAdmins.map((platformAdmin) => ({
          neighborhoodId: defaultNeighborhoodId,
          userId: platformAdmin.id,
          role: "neighborhood_admin" as const,
          status: "active" as const,
        }))
      )
      .onConflictDoNothing();
  }

  const groupAdmins = await db
    .select({ userId: groups.adminUserId })
    .from(groups)
    .where(eq(groups.neighborhoodId, defaultNeighborhoodId));

  const uniqueGroupAdminIds = Array.from(new Set(groupAdmins.map((row) => row.userId)));
  if (uniqueGroupAdminIds.length > 0) {
    await db
      .insert(neighborhoodMemberships)
      .values(
        uniqueGroupAdminIds.map((userId) => ({
          neighborhoodId: defaultNeighborhoodId,
          userId,
          role: "neighborhood_admin" as const,
          status: "active" as const,
        }))
      )
      .onConflictDoNothing();
  }

  console.log("Neighborhood backfill completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
