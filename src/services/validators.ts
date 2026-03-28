import { z } from "zod";

import { isValidTimezone } from "@/lib/timezones/catalog";

export const idSchema = z.string().uuid();
export const nameSchema = z.string().trim().min(1).max(120);
export const systemRoleSchema = z.enum(["user", "admin", "platform_admin"]);
export const roleSchema = systemRoleSchema;
export const neighborhoodRoleSchema = z.enum(["neighbor", "neighborhood_admin"]);
export const groupRoleSchema = z.enum(["group_member", "group_admin"]);
export const neighborhoodStatusSchema = z.enum(["active", "inactive"]);
export const statusSchema = z.enum(["active", "inactive"]);
export const groupInviteStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
]);
export const groupAccessRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
]);
export const preferredLanguageSchema = z.enum(["es", "en"]);
export const contributionMethodSchema = z.enum(["cash", "wire_transfer"]);
export const fundStatusSchema = z.enum(["active", "archived"]);
export const fundTemplateStatusSchema = z.enum(["active", "paused", "archived"]);
export const fundChargeFrequencySchema = z.enum([
  "monthly",
  "quarterly",
  "annual",
  "one_off",
]);
export const fundChargePeriodStatusSchema = z.enum(["open", "closed", "cancelled"]);
export const fundGroupChargeStatusSchema = z.enum([
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "waived",
]);
export const fundPaymentStatusSchema = z.enum(["submitted", "confirmed", "rejected"]);
export const fundPaymentMethodSchema = z.enum(["cash", "wire_transfer"]);
export const fundMovementTypeSchema = z.enum([
  "opening_balance",
  "payment",
  "expense",
  "manual_income",
  "adjustment",
  "reversal",
]);
export const fundEntrySideSchema = z.enum(["credit", "debit"]);
export const resourceStatusSchema = z.enum(["active", "inactive"]);
export const resourceReservationStatusSchema = z.enum([
  "approved",
  "cancelled",
  "completed",
  "expired",
]);
export const resourceBlockReasonSchema = z.enum([
  "maintenance",
  "cleaning",
  "repair",
  "neighborhood_event",
  "unavailable",
  "other",
]);
export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isValidTimezone(value), "Invalid time zone");
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/);

export const paginationSchema = z
  .object({
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().min(0).default(0),
  })
  .default({ limit: 50, offset: 0 });
