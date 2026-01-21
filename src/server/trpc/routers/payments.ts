import { z } from "zod";

import {
  closePaymentRequest,
  confirmPaymentReport,
  createPaymentRequest,
  deletePaymentReport,
  listPaymentRequests,
  rejectPaymentReport,
  submitPaymentReport,
  updatePaymentReportStatus,
  updatePaymentRequest,
} from "@/services/payments";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const paymentsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listPaymentRequests(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  createRequest: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        goalAmount: z.string().min(1),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPaymentRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateRequest: protectedProcedure
    .input(
      z.object({
        paymentRequestId: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        goalAmount: z.string().min(1).optional(),
        dueDate: z.date().optional(),
        status: z.enum(["open", "closed"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePaymentRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  closeRequest: protectedProcedure
    .input(z.object({ paymentRequestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await closePaymentRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  submitReport: protectedProcedure
    .input(
      z.object({
        paymentRequestId: z.string().uuid(),
        groupId: z.string().uuid(),
        method: z.enum(["cash", "wire_transfer"]),
        amount: z.string().min(1),
        wireReference: z.string().min(1).optional(),
        wireDate: z.date().optional(),
        wireAmount: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitPaymentReport(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  deleteReport: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deletePaymentReport(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateReportStatus: protectedProcedure
    .input(
      z.object({
        reportId: z.string().uuid(),
        status: z.enum(["submitted", "confirmed", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePaymentReportStatus(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  confirmReport: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmPaymentReport(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  rejectReport: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectPaymentReport(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
