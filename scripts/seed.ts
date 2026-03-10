import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  events,
  posts,
  fundraisingContributions,
  fundraisingCampaigns,
  pollOptions,
  polls,
  users,
  votes,
} from "@/db/schema";
import { auth } from "@/server/better-auth";

type SeedUser = {
  email: string;
  password: string;
  name: string;
  username: string;
  role: "user" | "admin" | "platform_admin";
};

const seedUsers: SeedUser[] = [
  {
    email: "admin@vecinohub.local",
    password: "Admin123!",
    name: "Vecino Platform Admin",
    username: "vecino_admin",
    role: "platform_admin",
  },
  {
    email: "ana@vecinohub.local",
    password: "User123!",
    name: "Ana Perez",
    username: "ana_perez",
    role: "user",
  },
  {
    email: "luis@vecinohub.local",
    password: "User123!",
    name: "Luis Romero",
    username: "luis_romero",
    role: "user",
  },
];

async function ensureUser(user: SeedUser) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing.length > 0) {
    if (!existing[0].username) {
      await db
        .update(users)
        .set({ username: user.username })
        .where(eq(users.id, existing[0].id));
    }
    return existing[0];
  }

  await auth.api.signUpEmail({
    body: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  });

  const created = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (!created[0]) {
    throw new Error(`Failed to create user ${user.email}`);
  }

  if (!created[0].username) {
    await db
      .update(users)
      .set({ username: user.username })
      .where(eq(users.id, created[0].id));
  }

  return created[0];
}

async function ensureNeighborhood(name: string, slug: string, createdBy: string) {
  const existing = await db
    .select()
    .from(neighborhoods)
    .where(eq(neighborhoods.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const created = await db
    .insert(neighborhoods)
    .values({
      name,
      slug,
      createdBy,
      status: "active",
    })
    .returning();

  if (!created[0]) {
    throw new Error(`Failed to create neighborhood with slug ${slug}`);
  }

  return created[0];
}

async function main() {
  const createdUsers = [];

  for (const user of seedUsers) {
    const dbUser = await ensureUser(user);
    if (dbUser.role !== user.role) {
      await db
        .update(users)
        .set({ role: user.role })
        .where(eq(users.id, dbUser.id));
    }
    createdUsers.push({ ...dbUser, role: user.role });
  }

  const [admin, ana, luis] = createdUsers;

  const [centroNeighborhood, surNeighborhood] = await Promise.all([
    ensureNeighborhood("Colonia Centro", "colonia-centro", admin.id),
    ensureNeighborhood("Jardines del Sur", "jardines-del-sur", admin.id),
  ]);

  await db
    .insert(neighborhoodMemberships)
    .values([
      {
        neighborhoodId: centroNeighborhood.id,
        userId: admin.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: admin.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: centroNeighborhood.id,
        userId: ana.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: luis.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: centroNeighborhood.id,
        userId: luis.id,
        role: "neighbor",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: ana.id,
        role: "neighbor",
      },
    ])
    .onConflictDoNothing();

  const existingGroups = await db.select().from(groups).limit(1);
  if (existingGroups.length > 0) {
    console.log("Groups already exist, skipping group/poll/fundraising seed.");
    return;
  }

  const createdGroups = await db
    .insert(groups)
    .values([
      {
        name: "Casa 101",
        address: "Calle Principal 101",
        neighborhoodId: centroNeighborhood.id,
      },
      {
        name: "Casa 202",
        address: "Calle Principal 202",
        neighborhoodId: surNeighborhood.id,
      },
    ])
    .returning();

  const [casa101, casa202] = createdGroups;

  await db.insert(groupMemberships).values([
    { groupId: casa101.id, userId: admin.id, role: "group_member" },
    { groupId: casa101.id, userId: ana.id, role: "group_admin" },
    { groupId: casa202.id, userId: admin.id, role: "group_member" },
    { groupId: casa202.id, userId: luis.id, role: "group_admin" },
    { groupId: casa202.id, userId: ana.id, role: "group_member" },
  ]);

  const [poll] = await db
    .insert(polls)
    .values({
      title: "Mejora del parque",
      description: "Aprobar presupuesto para mejorar el parque",
      status: "active",
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    })
    .returning();

  const createdOptions = await db
    .insert(pollOptions)
    .values([
      { pollId: poll.id, label: "Si", sortOrder: 1 },
      { pollId: poll.id, label: "No", sortOrder: 2 },
    ])
    .returning();

  await db.insert(votes).values([
    {
      pollId: poll.id,
      groupId: casa101.id,
      optionId: createdOptions[0].id,
      createdBy: admin.id,
    },
  ]);

  const [campaign] = await db
    .insert(fundraisingCampaigns)
    .values({
      title: "Pago de seguridad",
      description: "Pago mensual de guardia",
      amount: "150.00",
      goalAmount: "300.00",
      status: "open",
      dueDate: new Date().toISOString().split("T")[0],
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    })
    .returning();

  await db.insert(fundraisingContributions).values([
    {
      campaignId: campaign.id,
      groupId: casa101.id,
      submittedBy: ana.id,
      method: "wire_transfer",
      amount: "150.00",
      wireReference: "TRX-0001",
      wireDate: new Date().toISOString().split("T")[0],
      wireAmount: "150.00",
      status: "submitted",
    },
    {
      campaignId: campaign.id,
      groupId: casa202.id,
      submittedBy: luis.id,
      method: "cash",
      amount: "150.00",
      status: "submitted",
    },
  ]);

  await db.insert(events).values([
    {
      title: "Neighborhood cleanup",
      description: "Monthly community cleanup and meet-up.",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 2),
      location: "Community hall",
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    },
    {
      title: "Neighborhood watch meeting",
      description: "Monthly neighborhood watch sync.",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 60 * 2),
      location: "South Clubhouse",
      neighborhoodId: surNeighborhood.id,
      createdBy: admin.id,
    },
  ]);

  await db.insert(posts).values([
    {
      title: "Community update",
      content:
        "Thanks for participating in the last cleanup. We will share next steps soon.",
      status: "published",
      publishedAt: new Date(),
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    },
    {
      title: "South district update",
      content:
        "Welcome to VecinoHub for Jardines del Sur. Watch this board for local updates.",
      status: "published",
      publishedAt: new Date(),
      neighborhoodId: surNeighborhood.id,
      createdBy: admin.id,
    },
  ]);

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
