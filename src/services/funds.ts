import { and, count, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  fundChargePeriods,
  fundChargeTemplates,
  fundGroupCharges,
  fundMovements,
  fundPaymentAllocations,
  fundPaymentSubmissions,
  groupMemberships,
  groups,
  neighborhoodFunds,
  neighborhoodMemberships,
  users,
} from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  requireGroupMember,
  requireNeighborhoodAdminOrPlatform,
  requireNeighborhoodMember,
} from "./guards";
import type { ServiceContext } from "./types";
import {
  fundChargeFrequencySchema,
  fundChargePeriodStatusSchema,
  fundEntrySideSchema,
  fundMovementTypeSchema,
  fundPaymentMethodSchema,
  fundStatusSchema,
  fundTemplateStatusSchema,
  idSchema,
  nameSchema,
} from "./validators";

type FundsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toDateString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0] ?? "";
  }
  return value.split("T")[0] ?? value;
}

function nowDateString() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function combineFilters<T>(filters: Array<T | undefined>) {
  const filtered = filters.filter((filter): filter is T => Boolean(filter));
  if (filtered.length === 0) {
    return undefined;
  }

  const [first, ...rest] = filtered;
  return and(first as never, ...(rest as never[]));
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function computeGroupChargeStatus({
  amountDue,
  amountPaid,
  dueDate,
  waived,
}: {
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  waived?: boolean;
}): "unpaid" | "partial" | "paid" | "overdue" | "waived" {
  if (waived) {
    return "waived";
  }

  if (amountPaid >= amountDue) {
    return "paid";
  }

  if (dueDate < nowDateString()) {
    return "overdue";
  }

  if (amountPaid > 0) {
    return "partial";
  }

  return "unpaid";
}

async function getFundRecord(fundId: string) {
  const rows = await db
    .select()
    .from(neighborhoodFunds)
    .where(eq(neighborhoodFunds.id, fundId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Fund not found", "NOT_FOUND");
  }

  return rows[0];
}

async function requireFundAccess(ctx: ServiceContext, fundId: string) {
  const fund = await getFundRecord(fundId);
  await requireNeighborhoodMember(ctx, fund.neighborhoodId);
  return fund;
}

async function requireFundAdminScope(ctx: ServiceContext, fundId: string) {
  const fund = await getFundRecord(fundId);
  await requireNeighborhoodAdminOrPlatform(ctx, fund.neighborhoodId);
  return fund;
}

async function hasNeighborhoodAdminScope(ctx: ServiceContext, neighborhoodId: string) {
  if (isPlatformAdmin(ctx)) {
    return true;
  }

  const rows = await db
    .select({ id: neighborhoodMemberships.id })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
        eq(neighborhoodMemberships.role, "neighborhood_admin"),
        eq(neighborhoodMemberships.status, "active")
      )
    )
    .limit(1);

  return Boolean(rows[0]);
}

async function getFundBalance(fundId: string) {
  const rows = await db
    .select({
      credits: sql<string>`COALESCE(SUM(CASE WHEN ${fundMovements.entrySide} = 'credit' THEN ${fundMovements.amount}::numeric ELSE 0 END), 0)`,
      debits: sql<string>`COALESCE(SUM(CASE WHEN ${fundMovements.entrySide} = 'debit' THEN ${fundMovements.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(fundMovements)
    .where(eq(fundMovements.fundId, fundId));

  const credits = toNumber(rows[0]?.credits);
  const debits = toNumber(rows[0]?.debits);

  return {
    credits,
    debits,
    balance: credits - debits,
  };
}

async function getFundPeriodRecord(periodId: string) {
  const rows = await db
    .select()
    .from(fundChargePeriods)
    .where(eq(fundChargePeriods.id, periodId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Fund period not found", "NOT_FOUND");
  }

  return rows[0];
}

async function getGroupChargeRecord(groupChargeId: string) {
  const rows = await db
    .select({
      id: fundGroupCharges.id,
      periodId: fundGroupCharges.periodId,
      groupId: fundGroupCharges.groupId,
      amountDue: fundGroupCharges.amountDue,
      amountPaid: fundGroupCharges.amountPaid,
      status: fundGroupCharges.status,
      waivedBy: fundGroupCharges.waivedBy,
      periodFundId: fundChargePeriods.fundId,
      neighborhoodId: fundChargePeriods.neighborhoodId,
      dueDate: fundChargePeriods.dueDate,
      periodStatus: fundChargePeriods.status,
    })
    .from(fundGroupCharges)
    .innerJoin(fundChargePeriods, eq(fundGroupCharges.periodId, fundChargePeriods.id))
    .where(eq(fundGroupCharges.id, groupChargeId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Fund group charge not found", "NOT_FOUND");
  }

  return rows[0];
}

async function getEligibleGroupIds(neighborhoodId: string) {
  const rows = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      and(
        eq(groupMemberships.status, "active"),
        eq(groups.neighborhoodId, neighborhoodId)
      )
    );

  return [...new Set(rows.map((row) => row.groupId))];
}

async function ensureFundNameAvailable(
  neighborhoodId: string,
  name: string,
  excludeFundId?: string
) {
  const normalizedName = name.trim().toLowerCase();
  const duplicateRows = await db
    .select({ id: neighborhoodFunds.id })
    .from(neighborhoodFunds)
    .where(
      combineFilters([
        eq(neighborhoodFunds.neighborhoodId, neighborhoodId),
        sql`lower(${neighborhoodFunds.name}) = ${normalizedName}`,
        excludeFundId ? ne(neighborhoodFunds.id, excludeFundId) : undefined,
      ])
    )
    .limit(1);

  if (duplicateRows[0]) {
    throw new ServiceError("A fund with that name already exists", "INVALID");
  }
}

const createFundSchema = z.object({
  neighborhoodId: idSchema.optional(),
  name: nameSchema,
  description: z.string().trim().max(500).optional(),
  currencyCode: z.string().trim().min(3).max(3).default("MXN"),
});

export async function createNeighborhoodFund(
  ctx: ServiceContext,
  input: z.input<typeof createFundSchema>
) {
  const parsed = createFundSchema.parse(input);
  const neighborhoodId = parsed.neighborhoodId ?? ctx.user.activeNeighborhoodId;

  if (!neighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);
  await ensureFundNameAvailable(neighborhoodId, parsed.name);

  const created = await db
    .insert(neighborhoodFunds)
    .values({
      neighborhoodId,
      name: parsed.name,
      description: parsed.description,
      currencyCode: parsed.currencyCode.toUpperCase(),
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

const updateFundSchema = z.object({
  fundId: idSchema,
  name: nameSchema.optional(),
  description: z.string().trim().max(500).optional(),
  currencyCode: z.string().trim().min(3).max(3).optional(),
  status: fundStatusSchema.optional(),
});

export async function updateNeighborhoodFund(
  ctx: ServiceContext,
  input: z.input<typeof updateFundSchema>
) {
  const parsed = updateFundSchema.parse(input);
  const fund = await requireFundAdminScope(ctx, parsed.fundId);

  if (parsed.name) {
    await ensureFundNameAvailable(fund.neighborhoodId, parsed.name, parsed.fundId);
  }

  const updated = await db
    .update(neighborhoodFunds)
    .set({
      name: parsed.name,
      description: parsed.description,
      currencyCode: parsed.currencyCode?.toUpperCase(),
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(eq(neighborhoodFunds.id, parsed.fundId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Fund not found", "NOT_FOUND");
  }

  return updated[0];
}

const listNeighborhoodFundsSchema = z.object({
  neighborhoodId: idSchema,
});

export async function listNeighborhoodFunds(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodFundsSchema>
) {
  const { neighborhoodId } = listNeighborhoodFundsSchema.parse(input);
  await requireNeighborhoodMember(ctx, neighborhoodId);

  const funds = await db
    .select()
    .from(neighborhoodFunds)
    .where(eq(neighborhoodFunds.neighborhoodId, neighborhoodId));

  if (funds.length === 0) {
    return [];
  }

  const fundIds = funds.map((fund) => fund.id);
  const balances = await db
    .select({
      fundId: fundMovements.fundId,
      credits: sql<string>`COALESCE(SUM(CASE WHEN ${fundMovements.entrySide} = 'credit' THEN ${fundMovements.amount}::numeric ELSE 0 END), 0)`,
      debits: sql<string>`COALESCE(SUM(CASE WHEN ${fundMovements.entrySide} = 'debit' THEN ${fundMovements.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(fundMovements)
    .where(inArray(fundMovements.fundId, fundIds))
    .groupBy(fundMovements.fundId);

  const periods = await db
    .select({
      fundId: fundChargePeriods.fundId,
      periodId: fundChargePeriods.id,
      status: fundChargePeriods.status,
    })
    .from(fundChargePeriods)
    .where(inArray(fundChargePeriods.fundId, fundIds));

  const pendingPayments = await db
    .select({
      fundId: fundPaymentSubmissions.fundId,
      value: count(),
    })
    .from(fundPaymentSubmissions)
    .where(
      and(
        inArray(fundPaymentSubmissions.fundId, fundIds),
        eq(fundPaymentSubmissions.status, "submitted")
      )
    )
    .groupBy(fundPaymentSubmissions.fundId);

  const overdueRows = await db
    .select({
      fundId: fundChargePeriods.fundId,
      value: count(),
    })
    .from(fundGroupCharges)
    .innerJoin(fundChargePeriods, eq(fundGroupCharges.periodId, fundChargePeriods.id))
    .where(
      and(
        inArray(fundChargePeriods.fundId, fundIds),
        eq(fundGroupCharges.status, "overdue")
      )
    )
    .groupBy(fundChargePeriods.fundId);

  const balanceMap = new Map(
    balances.map((row) => [row.fundId, toNumber(row.credits) - toNumber(row.debits)])
  );
  const openPeriodsMap = new Map<string, number>();
  for (const period of periods) {
    if (period.status !== "open") {
      continue;
    }
    openPeriodsMap.set(period.fundId, (openPeriodsMap.get(period.fundId) ?? 0) + 1);
  }
  const pendingMap = new Map(pendingPayments.map((row) => [row.fundId, Number(row.value)]));
  const overdueMap = new Map(overdueRows.map((row) => [row.fundId, Number(row.value)]));

  return funds.map((fund) => ({
    ...fund,
    balance: balanceMap.get(fund.id) ?? 0,
    openPeriods: openPeriodsMap.get(fund.id) ?? 0,
    pendingPayments: pendingMap.get(fund.id) ?? 0,
    overdueCharges: overdueMap.get(fund.id) ?? 0,
  }));
}

const getFundOverviewSchema = z.object({
  fundId: idSchema,
});

export async function getNeighborhoodFundOverview(
  ctx: ServiceContext,
  input: z.input<typeof getFundOverviewSchema>
) {
  const { fundId } = getFundOverviewSchema.parse(input);
  const fund = await requireFundAccess(ctx, fundId);

  const [balance, periodCounts, paymentCounts, recentMovements, recentPeriods] = await Promise.all([
    getFundBalance(fundId),
    db
      .select({
        openPeriods: sql<number>`SUM(CASE WHEN ${fundChargePeriods.status} = 'open' THEN 1 ELSE 0 END)`,
        closedPeriods: sql<number>`SUM(CASE WHEN ${fundChargePeriods.status} = 'closed' THEN 1 ELSE 0 END)`,
      })
      .from(fundChargePeriods)
      .where(eq(fundChargePeriods.fundId, fundId)),
    db
      .select({
        pendingPayments: sql<number>`SUM(CASE WHEN ${fundPaymentSubmissions.status} = 'submitted' THEN 1 ELSE 0 END)`,
        confirmedPayments: sql<number>`SUM(CASE WHEN ${fundPaymentSubmissions.status} = 'confirmed' THEN 1 ELSE 0 END)`,
      })
      .from(fundPaymentSubmissions)
      .where(eq(fundPaymentSubmissions.fundId, fundId)),
    listFundMovements(ctx, { fundId, limit: 10, offset: 0 }),
    listFundChargePeriods(ctx, { fundId, limit: 5, offset: 0 }),
  ]);

  const overdueCharges = await db
    .select({ value: count() })
    .from(fundGroupCharges)
    .innerJoin(fundChargePeriods, eq(fundGroupCharges.periodId, fundChargePeriods.id))
    .where(
      and(eq(fundChargePeriods.fundId, fundId), eq(fundGroupCharges.status, "overdue"))
    );

  return {
    ...fund,
    balance: balance.balance,
    totalCredits: balance.credits,
    totalDebits: balance.debits,
    openPeriods: Number(periodCounts[0]?.openPeriods ?? 0),
    closedPeriods: Number(periodCounts[0]?.closedPeriods ?? 0),
    pendingPayments: Number(paymentCounts[0]?.pendingPayments ?? 0),
    confirmedPayments: Number(paymentCounts[0]?.confirmedPayments ?? 0),
    overdueCharges: Number(overdueCharges[0]?.value ?? 0),
    recentMovements,
    recentPeriods: recentPeriods.items,
  };
}

const createTemplateSchema = z
  .object({
    fundId: idSchema,
    title: nameSchema,
    description: z.string().trim().max(500).optional(),
    status: fundTemplateStatusSchema.optional(),
    frequency: fundChargeFrequencySchema,
    defaultAmount: z.string().trim().refine((value) => toNumber(value) > 0),
    dueDayOfMonth: z.number().int().min(1).max(31).optional(),
    startsOn: z.date(),
    endsOn: z.date().optional(),
  })
  .superRefine((value, refinementCtx) => {
    if (value.frequency !== "one_off" && !value.dueDayOfMonth) {
      refinementCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring templates require a due day of month",
      });
    }
  });

export async function createFundChargeTemplate(
  ctx: ServiceContext,
  input: z.input<typeof createTemplateSchema>
) {
  const parsed = createTemplateSchema.parse(input);
  const fund = await requireFundAdminScope(ctx, parsed.fundId);

  const created = await db
    .insert(fundChargeTemplates)
    .values({
      fundId: parsed.fundId,
      neighborhoodId: fund.neighborhoodId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status ?? "active",
      frequency: parsed.frequency,
      defaultAmount: parsed.defaultAmount,
      dueDayOfMonth: parsed.dueDayOfMonth,
      startsOn: toDateString(parsed.startsOn),
      endsOn: parsed.endsOn ? toDateString(parsed.endsOn) : null,
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

const updateTemplateSchema = z.object({
  templateId: idSchema,
  title: nameSchema.optional(),
  description: z.string().trim().max(500).optional(),
  status: fundTemplateStatusSchema.optional(),
  frequency: fundChargeFrequencySchema.optional(),
  defaultAmount: z
    .string()
    .trim()
    .refine((value) => toNumber(value) > 0)
    .optional(),
  dueDayOfMonth: z.number().int().min(1).max(31).optional(),
  startsOn: z.date().optional(),
  endsOn: z.date().optional(),
});

export async function updateFundChargeTemplate(
  ctx: ServiceContext,
  input: z.input<typeof updateTemplateSchema>
) {
  const parsed = updateTemplateSchema.parse(input);
  const rows = await db
    .select({ fundId: fundChargeTemplates.fundId })
    .from(fundChargeTemplates)
    .where(eq(fundChargeTemplates.id, parsed.templateId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Fund template not found", "NOT_FOUND");
  }

  await requireFundAdminScope(ctx, rows[0].fundId);

  const updated = await db
    .update(fundChargeTemplates)
    .set({
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      frequency: parsed.frequency,
      defaultAmount: parsed.defaultAmount,
      dueDayOfMonth: parsed.dueDayOfMonth,
      startsOn: parsed.startsOn ? toDateString(parsed.startsOn) : undefined,
      endsOn: parsed.endsOn ? toDateString(parsed.endsOn) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(fundChargeTemplates.id, parsed.templateId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Fund template not found", "NOT_FOUND");
  }

  return updated[0];
}

const listTemplatesSchema = z.object({
  fundId: idSchema,
});

export async function listFundChargeTemplates(
  ctx: ServiceContext,
  input: z.input<typeof listTemplatesSchema>
) {
  const { fundId } = listTemplatesSchema.parse(input);
  await requireFundAccess(ctx, fundId);

  return db
    .select()
    .from(fundChargeTemplates)
    .where(eq(fundChargeTemplates.fundId, fundId))
    .orderBy(desc(fundChargeTemplates.createdAt));
}

async function createPeriodWithCharges(
  tx: FundsTransaction,
  ctx: ServiceContext,
  input: {
    fundId: string;
    neighborhoodId: string;
    templateId?: string | null;
    title: string;
    description?: string;
    amountPerGroup: string;
    dueDate: string;
  }
) {
  const createdPeriods = await tx
    .insert(fundChargePeriods)
    .values({
      fundId: input.fundId,
      templateId: input.templateId ?? null,
      neighborhoodId: input.neighborhoodId,
      title: input.title,
      description: input.description,
      amountPerGroup: input.amountPerGroup,
      dueDate: input.dueDate,
      status: "open",
      createdBy: ctx.user.id,
    })
    .returning();

  const period = createdPeriods[0];
  if (!period) {
    throw new ServiceError("Failed to create fund period", "INVALID");
  }

  const groupIds = await getEligibleGroupIds(input.neighborhoodId);
  if (groupIds.length > 0) {
    await tx.insert(fundGroupCharges).values(
      groupIds.map((groupId) => ({
        periodId: period.id,
        groupId,
        amountDue: input.amountPerGroup,
        amountPaid: "0",
        status: computeGroupChargeStatus({
          amountDue: toNumber(input.amountPerGroup),
          amountPaid: 0,
          dueDate: input.dueDate,
        }),
      }))
    );
  }

  return period;
}

const createPeriodSchema = z.object({
  fundId: idSchema,
  templateId: idSchema.optional(),
  title: nameSchema,
  description: z.string().trim().max(500).optional(),
  amountPerGroup: z.string().trim().refine((value) => toNumber(value) > 0),
  dueDate: z.date(),
});

export async function createFundChargePeriod(
  ctx: ServiceContext,
  input: z.input<typeof createPeriodSchema>
) {
  const parsed = createPeriodSchema.parse(input);
  const fund = await requireFundAdminScope(ctx, parsed.fundId);

  if (parsed.templateId) {
    const templateRows = await db
      .select({ id: fundChargeTemplates.id, fundId: fundChargeTemplates.fundId })
      .from(fundChargeTemplates)
      .where(eq(fundChargeTemplates.id, parsed.templateId))
      .limit(1);

    if (!templateRows[0] || templateRows[0].fundId !== parsed.fundId) {
      throw new ServiceError("Template and fund do not match", "FORBIDDEN");
    }
  }

  return db.transaction((tx) =>
    createPeriodWithCharges(tx, ctx, {
      fundId: parsed.fundId,
      neighborhoodId: fund.neighborhoodId,
      templateId: parsed.templateId,
      title: parsed.title,
      description: parsed.description,
      amountPerGroup: parsed.amountPerGroup,
      dueDate: toDateString(parsed.dueDate),
    })
  );
}

const generatePeriodSchema = z.object({
  templateId: idSchema,
  dueDate: z.date(),
  title: nameSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export async function generateFundChargePeriod(
  ctx: ServiceContext,
  input: z.input<typeof generatePeriodSchema>
) {
  const parsed = generatePeriodSchema.parse(input);
  const templateRows = await db
    .select()
    .from(fundChargeTemplates)
    .where(eq(fundChargeTemplates.id, parsed.templateId))
    .limit(1);

  const template = templateRows[0];
  if (!template) {
    throw new ServiceError("Fund template not found", "NOT_FOUND");
  }

  await requireFundAdminScope(ctx, template.fundId);
  const dueDate = toDateString(parsed.dueDate);
  const duplicate = await db
    .select({ id: fundChargePeriods.id })
    .from(fundChargePeriods)
    .where(
      and(
        eq(fundChargePeriods.templateId, template.id),
        eq(fundChargePeriods.fundId, template.fundId),
        eq(fundChargePeriods.dueDate, dueDate)
      )
    )
    .limit(1);

  if (duplicate[0]) {
    throw new ServiceError("Fund period already generated for that due date", "INVALID");
  }

  return db.transaction((tx) =>
    createPeriodWithCharges(tx, ctx, {
      fundId: template.fundId,
      neighborhoodId: template.neighborhoodId,
      templateId: template.id,
      title: parsed.title ?? `${template.title} ${dueDate}`,
      description: parsed.description ?? template.description ?? undefined,
      amountPerGroup: template.defaultAmount,
      dueDate,
    })
  );
}

const listPeriodsSchema = z.object({
  fundId: idSchema,
  status: fundChargePeriodStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export async function listFundChargePeriods(
  ctx: ServiceContext,
  input: z.input<typeof listPeriodsSchema>
) {
  const { fundId, status, limit, offset } = listPeriodsSchema.parse(input);
  await requireFundAccess(ctx, fundId);

  const periods = await db
    .select()
    .from(fundChargePeriods)
    .where(combineFilters([eq(fundChargePeriods.fundId, fundId), status ? eq(fundChargePeriods.status, status) : undefined]))
    .orderBy(desc(fundChargePeriods.dueDate), desc(fundChargePeriods.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ value: count() })
    .from(fundChargePeriods)
    .where(combineFilters([eq(fundChargePeriods.fundId, fundId), status ? eq(fundChargePeriods.status, status) : undefined]));

  if (periods.length === 0) {
    return { items: [], total: Number(totalRows[0]?.value ?? 0) };
  }

  const periodIds = periods.map((period) => period.id);
  const groupChargeRows = await db
    .select({
      periodId: fundGroupCharges.periodId,
      amountDue: fundGroupCharges.amountDue,
      amountPaid: fundGroupCharges.amountPaid,
      status: fundGroupCharges.status,
    })
    .from(fundGroupCharges)
    .where(inArray(fundGroupCharges.periodId, periodIds));

  const statsMap = new Map<
    string,
    {
      totalExpected: number;
      totalCollected: number;
      paidCount: number;
      overdueCount: number;
      partialCount: number;
      unpaidCount: number;
      waivedCount: number;
    }
  >();

  for (const row of groupChargeRows) {
    const current = statsMap.get(row.periodId) ?? {
      totalExpected: 0,
      totalCollected: 0,
      paidCount: 0,
      overdueCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      waivedCount: 0,
    };
    current.totalExpected += toNumber(row.amountDue);
    current.totalCollected += Math.min(toNumber(row.amountPaid), toNumber(row.amountDue));
    if (row.status === "paid") current.paidCount += 1;
    if (row.status === "overdue") current.overdueCount += 1;
    if (row.status === "partial") current.partialCount += 1;
    if (row.status === "unpaid") current.unpaidCount += 1;
    if (row.status === "waived") current.waivedCount += 1;
    statsMap.set(row.periodId, current);
  }

  const items = periods.map((period) => ({
    ...period,
    stats: statsMap.get(period.id) ?? {
      totalExpected: 0,
      totalCollected: 0,
      paidCount: 0,
      overdueCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      waivedCount: 0,
    },
  }));

  return {
    items,
    total: Number(totalRows[0]?.value ?? 0),
  };
}

const getPeriodDetailSchema = z.object({
  periodId: idSchema,
});

export async function getFundPeriodDetail(
  ctx: ServiceContext,
  input: z.input<typeof getPeriodDetailSchema>
) {
  const { periodId } = getPeriodDetailSchema.parse(input);
  const period = await getFundPeriodRecord(periodId);
  const fund = await requireFundAccess(ctx, period.fundId);
  const canModerate = await hasNeighborhoodAdminScope(ctx, fund.neighborhoodId);

  // The per-group dues board (charges) stays neighborhood-visible, but a
  // non-admin resident may only see the individual payment details (amount,
  // method, date) of their own group(s).
  const visibleGroupIds = canModerate
    ? null
    : new Set(
        (
          await db
            .select({ groupId: groupMemberships.groupId })
            .from(groupMemberships)
            .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
            .where(
              and(
                eq(groupMemberships.userId, ctx.user.id),
                eq(groups.neighborhoodId, fund.neighborhoodId),
                eq(groupMemberships.status, "active")
              )
            )
        ).map((row) => row.groupId)
      );

  const [charges, payments] = await Promise.all([
    db
      .select({
        id: fundGroupCharges.id,
        groupId: fundGroupCharges.groupId,
        groupName: groups.name,
        amountDue: fundGroupCharges.amountDue,
        amountPaid: fundGroupCharges.amountPaid,
        status: fundGroupCharges.status,
        waivedReason: fundGroupCharges.waivedReason,
      })
      .from(fundGroupCharges)
      .innerJoin(groups, eq(fundGroupCharges.groupId, groups.id))
      .where(eq(fundGroupCharges.periodId, periodId)),
    db
      .select({
        id: fundPaymentSubmissions.id,
        groupChargeId: fundPaymentSubmissions.groupChargeId,
        groupId: fundPaymentSubmissions.groupId,
        groupName: groups.name,
        amount: fundPaymentSubmissions.amount,
        status: fundPaymentSubmissions.status,
        method: fundPaymentSubmissions.method,
        paidAt: fundPaymentSubmissions.paidAt,
        notes: fundPaymentSubmissions.notes,
        reference: fundPaymentSubmissions.reference,
        submittedByName: users.name,
        submittedByEmail: users.email,
      })
      .from(fundPaymentSubmissions)
      .innerJoin(fundGroupCharges, eq(fundPaymentSubmissions.groupChargeId, fundGroupCharges.id))
      .innerJoin(groups, eq(fundPaymentSubmissions.groupId, groups.id))
      .innerJoin(users, eq(fundPaymentSubmissions.submittedBy, users.id))
      .where(eq(fundGroupCharges.periodId, periodId)),
  ]);

  const sanitizedPayments = payments
    .filter((payment) => visibleGroupIds === null || visibleGroupIds.has(payment.groupId))
    .map((payment) =>
      canModerate
        ? payment
        : {
            id: payment.id,
            groupChargeId: payment.groupChargeId,
            groupId: payment.groupId,
            groupName: payment.groupName,
            amount: payment.amount,
            status: payment.status,
            method: payment.method,
            paidAt: payment.paidAt,
          }
    );

  return {
    ...period,
    fund,
    canModerate,
    groupCharges: charges.map((charge) => ({
      ...charge,
      remainingAmount: Math.max(0, toNumber(charge.amountDue) - toNumber(charge.amountPaid)),
    })),
    payments: sanitizedPayments,
  };
}

const submitPaymentSchema = z
  .object({
    fundId: idSchema,
    groupId: idSchema,
    groupChargeId: idSchema,
    method: fundPaymentMethodSchema,
    amount: z.string().trim().refine((value) => toNumber(value) > 0),
    paidAt: z.date(),
    reference: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, refinementCtx) => {
    if (value.method === "wire_transfer" && !value.reference?.trim()) {
      refinementCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wire transfer payments require a reference",
      });
    }
  });

export async function submitFundPayment(
  ctx: ServiceContext,
  input: z.input<typeof submitPaymentSchema>
) {
  const parsed = submitPaymentSchema.parse(input);
  const groupScope = await requireGroupMember(ctx, parsed.groupId);
  const charge = await getGroupChargeRecord(parsed.groupChargeId);

  if (charge.groupId !== parsed.groupId) {
    throw new ServiceError("Payment group does not match the selected charge", "FORBIDDEN");
  }

  if (charge.periodFundId !== parsed.fundId) {
    throw new ServiceError("Payment fund does not match the selected charge", "FORBIDDEN");
  }

  if (groupScope.neighborhoodId !== charge.neighborhoodId) {
    throw new ServiceError("Group and fund charge belong to different neighborhoods", "FORBIDDEN");
  }

  if (charge.periodStatus !== "open") {
    throw new ServiceError("Fund period is closed", "INVALID");
  }

  if (charge.status === "waived" || charge.status === "paid") {
    throw new ServiceError("This charge is no longer payable", "INVALID");
  }

  const created = await db
    .insert(fundPaymentSubmissions)
    .values({
      fundId: parsed.fundId,
      neighborhoodId: charge.neighborhoodId,
      groupChargeId: parsed.groupChargeId,
      groupId: parsed.groupId,
      submittedBy: ctx.user.id,
      method: parsed.method,
      amount: parsed.amount,
      paidAt: toDateString(parsed.paidAt),
      reference: parsed.reference,
      notes: parsed.notes,
      status: "submitted",
    })
    .returning();

  return created[0];
}

const confirmPaymentSchema = z.object({
  paymentId: idSchema,
});

export async function confirmFundPayment(
  ctx: ServiceContext,
  input: z.input<typeof confirmPaymentSchema>
) {
  const { paymentId } = confirmPaymentSchema.parse(input);
  const paymentRows = await db
    .select()
    .from(fundPaymentSubmissions)
    .where(eq(fundPaymentSubmissions.id, paymentId))
    .limit(1);

  const payment = paymentRows[0];
  if (!payment) {
    throw new ServiceError("Fund payment not found", "NOT_FOUND");
  }

  await requireFundAdminScope(ctx, payment.fundId);

  if (payment.status !== "submitted") {
    throw new ServiceError("Only submitted payments can be confirmed", "INVALID");
  }

  const charge = await getGroupChargeRecord(payment.groupChargeId);
  if (charge.periodFundId !== payment.fundId || charge.groupId !== payment.groupId) {
    throw new ServiceError("Payment and charge do not match", "FORBIDDEN");
  }

  if (charge.periodStatus !== "open") {
    throw new ServiceError("Fund period is closed", "INVALID");
  }

  // Mirror the submit-time guard: a waived charge is not payable, so a payment
  // submitted before the waiver must not be confirmable afterward (it would
  // credit the fund while the charge still reads "waived").
  if (charge.status === "waived") {
    throw new ServiceError("This charge has been waived", "INVALID");
  }

  return db.transaction(async (tx) => {
    await tx.insert(fundPaymentAllocations).values({
      paymentId: payment.id,
      groupChargeId: payment.groupChargeId,
      amount: payment.amount,
    });

    // Increment atomically in SQL rather than reading amountPaid outside the txn
    // and writing back a computed value: under READ COMMITTED two concurrent
    // confirmations of different payments on the same charge would otherwise both
    // read the same starting balance and the second would clobber the first.
    const [incremented] = await tx
      .update(fundGroupCharges)
      .set({
        amountPaid: sql`${fundGroupCharges.amountPaid} + ${payment.amount}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(fundGroupCharges.id, charge.id))
      .returning({ amountPaid: fundGroupCharges.amountPaid });

    const nextStatus = computeGroupChargeStatus({
      amountDue: toNumber(charge.amountDue),
      amountPaid: toNumber(incremented.amountPaid),
      dueDate: charge.dueDate,
      waived: Boolean(charge.waivedBy),
    });

    await tx
      .update(fundGroupCharges)
      .set({ status: nextStatus })
      .where(eq(fundGroupCharges.id, charge.id));

    await tx.insert(fundMovements).values({
      fundId: payment.fundId,
      neighborhoodId: payment.neighborhoodId,
      type: "payment",
      entrySide: "credit",
      amount: payment.amount,
      effectiveAt: new Date(`${payment.paidAt}T12:00:00.000Z`),
      description: `Confirmed payment for group ${payment.groupId}`,
      sourceType: "payment",
      sourceId: payment.id,
      createdBy: ctx.user.id,
    });

    const updated = await tx
      .update(fundPaymentSubmissions)
      .set({
        status: "confirmed",
        confirmedBy: ctx.user.id,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fundPaymentSubmissions.id, payment.id))
      .returning();

    return updated[0];
  });
}

const rejectPaymentSchema = z.object({
  paymentId: idSchema,
  rejectionReason: z.string().trim().max(500).optional(),
});

export async function rejectFundPayment(
  ctx: ServiceContext,
  input: z.input<typeof rejectPaymentSchema>
) {
  const parsed = rejectPaymentSchema.parse(input);
  const paymentRows = await db
    .select()
    .from(fundPaymentSubmissions)
    .where(eq(fundPaymentSubmissions.id, parsed.paymentId))
    .limit(1);

  const payment = paymentRows[0];
  if (!payment) {
    throw new ServiceError("Fund payment not found", "NOT_FOUND");
  }

  await requireFundAdminScope(ctx, payment.fundId);

  if (payment.status !== "submitted") {
    throw new ServiceError("Only submitted payments can be rejected", "INVALID");
  }

  const updated = await db
    .update(fundPaymentSubmissions)
    .set({
      status: "rejected",
      rejectionReason: parsed.rejectionReason,
      updatedAt: new Date(),
    })
    .where(eq(fundPaymentSubmissions.id, parsed.paymentId))
    .returning();

  return updated[0];
}

const listMovementsSchema = z
  .object({
    fundId: idSchema,
    query: z.string().trim().optional(),
    type: fundMovementTypeSchema.optional(),
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().min(0).default(0),
  });

export async function listFundMovements(
  ctx: ServiceContext,
  input: z.input<typeof listMovementsSchema>
) {
  const { fundId, query, type, limit, offset } = listMovementsSchema.parse(input);
  await requireFundAccess(ctx, fundId);

  const filters = [
    eq(fundMovements.fundId, fundId),
    type ? eq(fundMovements.type, type) : undefined,
    query ? ilike(fundMovements.description, `%${query}%`) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: fundMovements.id,
      type: fundMovements.type,
      entrySide: fundMovements.entrySide,
      amount: fundMovements.amount,
      effectiveAt: fundMovements.effectiveAt,
      description: fundMovements.description,
      sourceType: fundMovements.sourceType,
      sourceId: fundMovements.sourceId,
      createdAt: fundMovements.createdAt,
      createdByName: users.name,
    })
    .from(fundMovements)
    .leftJoin(users, eq(fundMovements.createdBy, users.id))
    .where(combineFilters(filters))
    .orderBy(desc(fundMovements.effectiveAt), desc(fundMovements.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

const groupSummarySchema = z.object({
  groupId: idSchema,
  fundId: idSchema,
});

export async function getGroupFundSummary(
  ctx: ServiceContext,
  input: z.input<typeof groupSummarySchema>
) {
  const { groupId, fundId } = groupSummarySchema.parse(input);
  const groupScope = await requireGroupMember(ctx, groupId);
  const fund = await requireFundAccess(ctx, fundId);

  if (groupScope.neighborhoodId !== fund.neighborhoodId) {
    throw new ServiceError("Group and fund belong to different neighborhoods", "FORBIDDEN");
  }

  const charges = await db
    .select({
      id: fundGroupCharges.id,
      periodId: fundGroupCharges.periodId,
      title: fundChargePeriods.title,
      dueDate: fundChargePeriods.dueDate,
      periodStatus: fundChargePeriods.status,
      amountDue: fundGroupCharges.amountDue,
      amountPaid: fundGroupCharges.amountPaid,
      status: fundGroupCharges.status,
    })
    .from(fundGroupCharges)
    .innerJoin(fundChargePeriods, eq(fundGroupCharges.periodId, fundChargePeriods.id))
    .where(and(eq(fundGroupCharges.groupId, groupId), eq(fundChargePeriods.fundId, fundId)))
    .orderBy(desc(fundChargePeriods.dueDate));

  const totalDue = charges.reduce((sum, charge) => sum + toNumber(charge.amountDue), 0);
  const totalPaid = charges.reduce((sum, charge) => sum + toNumber(charge.amountPaid), 0);

  return {
    fund,
    charges: charges.map((charge) => ({
      ...charge,
      remainingAmount: Math.max(0, toNumber(charge.amountDue) - toNumber(charge.amountPaid)),
    })),
    totalDue,
    totalPaid,
    outstandingAmount: Math.max(0, totalDue - totalPaid),
  };
}

export async function getResidentFundDashboard(
  ctx: ServiceContext,
  input: z.input<typeof groupSummarySchema>
) {
  const parsed = groupSummarySchema.parse(input);
  const [overview, groupSummary, periods] = await Promise.all([
    getNeighborhoodFundOverview(ctx, { fundId: parsed.fundId }),
    getGroupFundSummary(ctx, parsed),
    listFundChargePeriods(ctx, { fundId: parsed.fundId, limit: 10, offset: 0 }),
  ]);

  return {
    overview,
    groupSummary,
    periods: periods.items,
  };
}

const recordMovementSchema = z.object({
  fundId: idSchema,
  amount: z.string().trim().refine((value) => toNumber(value) > 0),
  effectiveAt: z.date().optional(),
  description: z.string().trim().min(1).max(500),
});

async function createManualMovement(
  ctx: ServiceContext,
  input: z.input<typeof recordMovementSchema>,
  config: { type: "expense" | "manual_income"; entrySide: "credit" | "debit" }
) {
  const parsed = recordMovementSchema.parse(input);
  const fund = await requireFundAdminScope(ctx, parsed.fundId);

  const created = await db
    .insert(fundMovements)
    .values({
      fundId: parsed.fundId,
      neighborhoodId: fund.neighborhoodId,
      type: config.type,
      entrySide: config.entrySide,
      amount: parsed.amount,
      effectiveAt: parsed.effectiveAt ?? new Date(),
      description: parsed.description,
      sourceType: config.type,
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

export async function recordFundExpense(
  ctx: ServiceContext,
  input: z.input<typeof recordMovementSchema>
) {
  return createManualMovement(ctx, input, { type: "expense", entrySide: "debit" });
}

export async function recordFundManualIncome(
  ctx: ServiceContext,
  input: z.input<typeof recordMovementSchema>
) {
  return createManualMovement(ctx, input, {
    type: "manual_income",
    entrySide: "credit",
  });
}

const recordAdjustmentSchema = z.object({
  fundId: idSchema,
  amount: z.string().trim().refine((value) => toNumber(value) > 0),
  effectiveAt: z.date().optional(),
  description: z.string().trim().min(1).max(500),
  entrySide: fundEntrySideSchema,
});

export async function recordFundAdjustment(
  ctx: ServiceContext,
  input: z.input<typeof recordAdjustmentSchema>
) {
  const parsed = recordAdjustmentSchema.parse(input);
  const fund = await requireFundAdminScope(ctx, parsed.fundId);

  const created = await db
    .insert(fundMovements)
    .values({
      fundId: parsed.fundId,
      neighborhoodId: fund.neighborhoodId,
      type: "adjustment",
      entrySide: parsed.entrySide,
      amount: parsed.amount,
      effectiveAt: parsed.effectiveAt ?? new Date(),
      description: parsed.description,
      sourceType: "adjustment",
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

const reverseMovementSchema = z.object({
  movementId: idSchema,
  description: z.string().trim().min(1).max(500).optional(),
});

export async function reverseFundMovement(
  ctx: ServiceContext,
  input: z.input<typeof reverseMovementSchema>
) {
  const parsed = reverseMovementSchema.parse(input);
  const rows = await db
    .select()
    .from(fundMovements)
    .where(eq(fundMovements.id, parsed.movementId))
    .limit(1);

  const movement = rows[0];
  if (!movement) {
    throw new ServiceError("Fund movement not found", "NOT_FOUND");
  }

  await requireFundAdminScope(ctx, movement.fundId);

  if (movement.type === "reversal") {
    throw new ServiceError("A reversal cannot be reversed", "INVALID");
  }

  return db.transaction(async (tx) => {
    // A movement may be reversed at most once. Without this guard a
    // double-click/retry (or two admins) inserts multiple opposite entries and
    // drives the fund balance arbitrarily wrong. Also enforced at the DB level
    // by the partial unique index fund_movements_reversal_source_unique
    // (migration 0018), which closes the truly-concurrent window.
    const existing = await tx
      .select({ id: fundMovements.id })
      .from(fundMovements)
      .where(and(eq(fundMovements.type, "reversal"), eq(fundMovements.sourceId, movement.id)))
      .limit(1);

    if (existing[0]) {
      throw new ServiceError("This movement has already been reversed", "INVALID");
    }

    const reversed = await tx
      .insert(fundMovements)
      .values({
        fundId: movement.fundId,
        neighborhoodId: movement.neighborhoodId,
        type: "reversal",
        entrySide: movement.entrySide === "credit" ? "debit" : "credit",
        amount: movement.amount,
        effectiveAt: new Date(),
        description:
          parsed.description ??
          `Reversal of movement ${movement.id}: ${movement.description}`,
        sourceType: "reversal",
        sourceId: movement.id,
        createdBy: ctx.user.id,
      })
      .returning();

    return reversed[0];
  });
}

const waiveGroupChargeSchema = z.object({
  groupChargeId: idSchema,
  waivedReason: z.string().trim().max(500).optional(),
});

export async function waiveFundGroupCharge(
  ctx: ServiceContext,
  input: z.input<typeof waiveGroupChargeSchema>
) {
  const parsed = waiveGroupChargeSchema.parse(input);
  const charge = await getGroupChargeRecord(parsed.groupChargeId);
  await requireFundAdminScope(ctx, charge.periodFundId);

  const updated = await db
    .update(fundGroupCharges)
    .set({
      status: "waived",
      waivedBy: ctx.user.id,
      waivedReason: parsed.waivedReason,
      updatedAt: new Date(),
    })
    .where(eq(fundGroupCharges.id, parsed.groupChargeId))
    .returning();

  return updated[0];
}
