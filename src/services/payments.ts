import { and, count, countDistinct, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  groupMemberships,
  groups,
  paymentReports,
  paymentRequests,
  users,
} from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin, requireGroupMember } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, paymentMethodSchema } from "./validators";

const createRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  goalAmount: z.string().min(1),
  dueDate: z.date().optional(),
});

export async function createPaymentRequest(
  ctx: ServiceContext,
  input: z.input<typeof createRequestSchema>
) {
  requireAdmin(ctx);
  const { title, description, goalAmount, dueDate } =
    createRequestSchema.parse(input);

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .where(eq(groupMemberships.status, "active"));
  const activeGroups = Number(activeGroupsResult[0]?.value ?? 0);
  const perGroupAmount =
    activeGroups > 0
      ? (Number(goalAmount) / activeGroups).toFixed(2)
      : goalAmount;

  const created = await db
    .insert(paymentRequests)
    .values({
      title,
      description,
      amount: perGroupAmount,
      goalAmount,
      dueDate,
      status: "open",
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

const updateRequestSchema = z.object({
  paymentRequestId: idSchema,
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  goalAmount: z.string().min(1).optional(),
  dueDate: z.date().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

export async function updatePaymentRequest(
  ctx: ServiceContext,
  input: z.input<typeof updateRequestSchema>
) {
  requireAdmin(ctx);
  const { paymentRequestId, goalAmount, ...data } =
    updateRequestSchema.parse(input);

  let amount: string | undefined;
  if (goalAmount) {
    const activeGroupsResult = await db
      .select({ value: countDistinct(groupMemberships.groupId) })
      .from(groupMemberships)
      .where(eq(groupMemberships.status, "active"));
    const activeGroups = Number(activeGroupsResult[0]?.value ?? 0);
    amount =
      activeGroups > 0
        ? (Number(goalAmount) / activeGroups).toFixed(2)
        : goalAmount;
  }

  const updated = await db
    .update(paymentRequests)
    .set({
      ...data,
      goalAmount: goalAmount ?? undefined,
      amount: amount ?? undefined,
    })
    .where(eq(paymentRequests.id, paymentRequestId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  return updated[0];
}

const closeRequestSchema = z.object({
  paymentRequestId: idSchema,
});

export async function closePaymentRequest(
  ctx: ServiceContext,
  input: z.input<typeof closeRequestSchema>
) {
  requireAdmin(ctx);
  const { paymentRequestId } = closeRequestSchema.parse(input);

  const updated = await db
    .update(paymentRequests)
    .set({ status: "closed" })
    .where(eq(paymentRequests.id, paymentRequestId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  return updated[0];
}

const submitReportSchema = z
  .object({
    paymentRequestId: idSchema,
    groupId: idSchema,
    method: paymentMethodSchema,
    amount: z.string().min(1),
    wireReference: z.string().min(1).optional(),
    wireDate: z.date().optional(),
    wireAmount: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "wire_transfer") {
      if (!value.wireReference || !value.wireDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wire transfer details are required",
        });
      }
    }
  });

export async function submitPaymentReport(
  ctx: ServiceContext,
  input: z.input<typeof submitReportSchema>
) {
  const parsed = submitReportSchema.parse(input);
  await requireGroupMember(ctx, parsed.groupId);

  const request = await db
    .select({ status: paymentRequests.status })
    .from(paymentRequests)
    .where(eq(paymentRequests.id, parsed.paymentRequestId))
    .limit(1);

  if (!request[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  if (request[0].status !== "open") {
    throw new ServiceError("Payment request is closed", "INVALID");
  }

  const created = await db
    .insert(paymentReports)
    .values({
      paymentRequestId: parsed.paymentRequestId,
      groupId: parsed.groupId,
      submittedBy: ctx.user.id,
      method: parsed.method,
      amount: parsed.amount,
      wireReference: parsed.wireReference,
      wireDate: parsed.wireDate,
      wireAmount: parsed.method === "wire_transfer" ? parsed.amount : undefined,
      status: "submitted",
    })
    .returning({ id: paymentReports.id });

  return created[0];
}

const deleteReportSchema = z.object({
  reportId: idSchema,
});

export async function deletePaymentReport(
  ctx: ServiceContext,
  input: z.input<typeof deleteReportSchema>
) {
  const { reportId } = deleteReportSchema.parse(input);

  const report = await db
    .select({
      id: paymentReports.id,
      submittedBy: paymentReports.submittedBy,
      paymentRequestId: paymentReports.paymentRequestId,
    })
    .from(paymentReports)
    .where(eq(paymentReports.id, reportId))
    .limit(1);

  if (!report[0]) {
    throw new ServiceError("Payment report not found", "NOT_FOUND");
  }

  if (ctx.user.role !== "admin" && report[0].submittedBy !== ctx.user.id) {
    throw new ServiceError("Cannot delete this report", "FORBIDDEN");
  }

  const request = await db
    .select({ status: paymentRequests.status })
    .from(paymentRequests)
    .where(eq(paymentRequests.id, report[0].paymentRequestId))
    .limit(1);

  if (!request[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  if (request[0].status !== "open") {
    throw new ServiceError("Payment request is closed", "INVALID");
  }

  const deleted = await db
    .delete(paymentReports)
    .where(eq(paymentReports.id, reportId))
    .returning({ id: paymentReports.id });

  if (!deleted[0]) {
    throw new ServiceError("Payment report not found", "NOT_FOUND");
  }

  return deleted[0];
}

const confirmReportSchema = z.object({
  reportId: idSchema,
});

const updateReportStatusSchema = z.object({
  reportId: idSchema,
  status: z.enum(["submitted", "confirmed", "rejected"]),
});

export async function updatePaymentReportStatus(
  ctx: ServiceContext,
  input: z.input<typeof updateReportStatusSchema>
) {
  requireAdmin(ctx);
  const { reportId, status } = updateReportStatusSchema.parse(input);

  const report = await db
    .select({
      id: paymentReports.id,
      paymentRequestId: paymentReports.paymentRequestId,
    })
    .from(paymentReports)
    .where(eq(paymentReports.id, reportId))
    .limit(1);

  if (!report[0]) {
    throw new ServiceError("Report not found", "NOT_FOUND");
  }

  const request = await db
    .select({ status: paymentRequests.status })
    .from(paymentRequests)
    .where(eq(paymentRequests.id, report[0].paymentRequestId))
    .limit(1);

  if (!request[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  if (request[0].status !== "open") {
    throw new ServiceError("Payment request is closed", "INVALID");
  }

  const updated = await db
    .update(paymentReports)
    .set({
      status,
      confirmedBy: status === "confirmed" ? ctx.user.id : null,
    })
    .where(eq(paymentReports.id, reportId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Report not found", "NOT_FOUND");
  }

  return updated[0];
}

export async function confirmPaymentReport(
  ctx: ServiceContext,
  input: z.input<typeof confirmReportSchema>
) {
  const { reportId } = confirmReportSchema.parse(input);
  return updatePaymentReportStatus(ctx, {
    reportId,
    status: "confirmed",
  });
}

const rejectReportSchema = z.object({
  reportId: idSchema,
});

export async function rejectPaymentReport(
  ctx: ServiceContext,
  input: z.input<typeof rejectReportSchema>
) {
  const { reportId } = rejectReportSchema.parse(input);
  return updatePaymentReportStatus(ctx, {
    reportId,
    status: "rejected",
  });
}

export async function listPaymentRequests(ctx: ServiceContext) {
  if (ctx.user.role === "admin") {
    return db.select().from(paymentRequests);
  }

  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, ctx.user.id));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const requests = await db.select().from(paymentRequests);
  const reports = await db
    .select()
    .from(paymentReports)
    .where(inArray(paymentReports.groupId, groupIds));

  return requests.map((request) => ({
    ...request,
    reports: reports.filter((report) => report.paymentRequestId === request.id),
  }));
}

const listPaymentRequestsPagedSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listPaymentRequestsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listPaymentRequestsPagedSchema>
) {
  const { query, status, limit, offset } = listPaymentRequestsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  const filters = [
    search ? ilike(paymentRequests.title, search) : undefined,
    status ? eq(paymentRequests.status, status) : undefined,
  ].filter(Boolean);

  const items = await db
    .select()
    .from(paymentRequests)
    .where(filters.length ? and(...(filters as [typeof paymentRequests.status, ...unknown[]])) : undefined)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(paymentRequests)
    .where(filters.length ? and(...(filters as [typeof paymentRequests.status, ...unknown[]])) : undefined);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const getRequestSchema = z.object({ paymentRequestId: idSchema });

export async function getPaymentRequestDetail(
  ctx: ServiceContext,
  input: z.input<typeof getRequestSchema>
) {
  const { paymentRequestId } = getRequestSchema.parse(input);

  const request = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, paymentRequestId))
    .limit(1);

  if (!request[0]) {
    throw new ServiceError("Payment request not found", "NOT_FOUND");
  }

  if (ctx.user.role === "admin") {
    const reports = await db
      .select({
        id: paymentReports.id,
        paymentRequestId: paymentReports.paymentRequestId,
        groupId: paymentReports.groupId,
        groupName: groups.name,
        submittedBy: paymentReports.submittedBy,
        submittedByName: users.name,
        submittedByEmail: users.email,
        method: paymentReports.method,
        amount: paymentReports.amount,
        wireReference: paymentReports.wireReference,
        wireDate: paymentReports.wireDate,
        wireAmount: paymentReports.wireAmount,
        status: paymentReports.status,
        confirmedBy: paymentReports.confirmedBy,
        createdAt: paymentReports.createdAt,
        updatedAt: paymentReports.updatedAt,
      })
      .from(paymentReports)
      .innerJoin(groups, eq(paymentReports.groupId, groups.id))
      .innerJoin(users, eq(paymentReports.submittedBy, users.id))
      .where(eq(paymentReports.paymentRequestId, paymentRequestId));

    return { ...request[0], reports };
  }

  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, ctx.user.id));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    throw new ServiceError("Membership required", "FORBIDDEN");
  }

  const reports = await db
    .select()
    .from(paymentReports)
    .where(
      and(
        eq(paymentReports.paymentRequestId, paymentRequestId),
        inArray(paymentReports.groupId, groupIds)
      )
    );

  return { ...request[0], reports };
}

export async function listOpenPaymentsWithReportCounts(ctx: ServiceContext) {
  requireAdmin(ctx);
  const openRequests = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.status, "open"));

  if (openRequests.length === 0) {
    return [];
  }

  const requestIds = openRequests.map((request) => request.id);
  const reportCounts = await db
    .select({ paymentRequestId: paymentReports.paymentRequestId, total: count() })
    .from(paymentReports)
    .where(inArray(paymentReports.paymentRequestId, requestIds))
    .groupBy(paymentReports.paymentRequestId);

  const counts = new Map(
    reportCounts.map((row) => [row.paymentRequestId, Number(row.total)])
  );

  return openRequests.map((request) => ({
    ...request,
    reportCount: counts.get(request.id) ?? 0,
  }));
}

const paymentParticipationSchema = z.object({ paymentRequestId: idSchema });

export async function getPaymentParticipation(
  ctx: ServiceContext,
  input: z.input<typeof paymentParticipationSchema>
) {
  requireAdmin(ctx);
  const { paymentRequestId } = paymentParticipationSchema.parse(input);

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .where(eq(groupMemberships.status, "active"));

  const reportingGroupsResult = await db
    .select({ value: countDistinct(paymentReports.groupId) })
    .from(paymentReports)
    .innerJoin(
      groupMemberships,
      and(
        eq(paymentReports.groupId, groupMemberships.groupId),
        eq(groupMemberships.status, "active")
      )
    )
    .where(eq(paymentReports.paymentRequestId, paymentRequestId));

  return {
    activeGroups: Number(activeGroupsResult[0]?.value ?? 0),
    reportingGroups: Number(reportingGroupsResult[0]?.value ?? 0),
  };
}
