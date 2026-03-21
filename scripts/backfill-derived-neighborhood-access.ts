import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoodMemberships } from "@/db/schema";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const activeNeighborMemberships = await db
    .select({
      id: neighborhoodMemberships.id,
      neighborhoodId: neighborhoodMemberships.neighborhoodId,
      userId: neighborhoodMemberships.userId,
    })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.role, "neighbor"),
        eq(neighborhoodMemberships.status, "active")
      )
    );

  let inactivated = 0;

  for (const membership of activeNeighborMemberships) {
    const activeGroupRows = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
      .where(
        and(
          eq(groupMemberships.userId, membership.userId),
          eq(groupMemberships.status, "active"),
          eq(groups.neighborhoodId, membership.neighborhoodId)
        )
      )
      .limit(1);

    if (activeGroupRows[0]) {
      continue;
    }

    inactivated += 1;

    if (!dryRun) {
      await db
        .update(neighborhoodMemberships)
        .set({
          status: "inactive",
          updatedAt: new Date(),
        })
        .where(eq(neighborhoodMemberships.id, membership.id));
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        inspectedActiveNeighborMemberships: activeNeighborMemberships.length,
        inactivated,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
