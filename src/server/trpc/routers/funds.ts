import { z } from "zod";

import {
  confirmFundPayment,
  createFundChargePeriod,
  createFundChargeTemplate,
  createNeighborhoodFund,
  generateFundChargePeriod,
  getFundPeriodDetail,
  getGroupFundSummary,
  getNeighborhoodFundOverview,
  listFundChargePeriods,
  listFundChargeTemplates,
  listFundMovements,
  listNeighborhoodFunds,
  recordFundAdjustment,
  recordFundExpense,
  recordFundManualIncome,
  rejectFundPayment,
  reverseFundMovement,
  submitFundPayment,
  updateFundChargeTemplate,
  updateNeighborhoodFund,
  waiveFundGroupCharge,
} from "@/services/funds";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const fundsRouter = createTRPCRouter({
  listFunds: protectedProcedure
    .input(z.object({ neighborhoodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodFunds(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  getOverview: protectedProcedure
    .input(z.object({ fundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getNeighborhoodFundOverview(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listPeriods: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        status: z.enum(["open", "closed", "cancelled"]).optional(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listFundChargePeriods(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  getPeriodDetail: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getFundPeriodDetail(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listMovements: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        query: z.string().optional(),
        type: z
          .enum([
            "opening_balance",
            "payment",
            "expense",
            "manual_income",
            "adjustment",
            "reversal",
          ])
          .optional(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listFundMovements(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  getGroupSummary: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), fundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getGroupFundSummary(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listTemplates: protectedProcedure
    .input(z.object({ fundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listFundChargeTemplates(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  createFund: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        currencyCode: z.string().min(3).max(3).default("MXN"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createNeighborhoodFund(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateFund: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
        currencyCode: z.string().min(3).max(3).optional(),
        status: z.enum(["active", "archived"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNeighborhoodFund(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  createChargeTemplate: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        title: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_off"]),
        defaultAmount: z.string().min(1),
        dueDayOfMonth: z.number().int().min(1).max(31).optional(),
        startsOn: z.date(),
        endsOn: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createFundChargeTemplate(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateChargeTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        title: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "one_off"]).optional(),
        defaultAmount: z.string().min(1).optional(),
        dueDayOfMonth: z.number().int().min(1).max(31).optional(),
        startsOn: z.date().optional(),
        endsOn: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateFundChargeTemplate(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  createChargePeriod: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        templateId: z.string().uuid().optional(),
        title: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        amountPerGroup: z.string().min(1),
        dueDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createFundChargePeriod(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  generateChargePeriod: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        dueDate: z.date(),
        title: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateFundChargePeriod(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  submitPayment: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        groupId: z.string().uuid(),
        groupChargeId: z.string().uuid(),
        method: z.enum(["cash", "wire_transfer"]),
        amount: z.string().min(1),
        paidAt: z.date(),
        reference: z.string().max(120).optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitFundPayment(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  confirmPayment: protectedProcedure
    .input(z.object({ paymentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmFundPayment(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  rejectPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        rejectionReason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectFundPayment(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  recordExpense: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        amount: z.string().min(1),
        effectiveAt: z.date().optional(),
        description: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordFundExpense(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  recordManualIncome: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        amount: z.string().min(1),
        effectiveAt: z.date().optional(),
        description: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordFundManualIncome(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  recordAdjustment: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        amount: z.string().min(1),
        effectiveAt: z.date().optional(),
        description: z.string().min(1).max(500),
        entrySide: z.enum(["credit", "debit"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordFundAdjustment(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  waiveGroupCharge: protectedProcedure
    .input(
      z.object({
        groupChargeId: z.string().uuid(),
        waivedReason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await waiveFundGroupCharge(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  reverseMovement: protectedProcedure
    .input(
      z.object({
        movementId: z.string().uuid(),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reverseFundMovement(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
