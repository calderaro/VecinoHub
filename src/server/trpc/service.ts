import { TRPCError } from "@trpc/server";

import { ServiceError } from "@/services/errors";
import type { ServiceContext } from "@/services/types";

import type { TRPCContext } from "./context";

export function getServiceContext(ctx: TRPCContext): ServiceContext {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return { user: ctx.session.user };
}

export function handleServiceError(error: unknown): never {
  if (error instanceof ServiceError) {
    const code =
      error.code === "UNAUTHORIZED"
        ? "UNAUTHORIZED"
        : error.code === "FORBIDDEN"
          ? "FORBIDDEN"
          : error.code === "NOT_FOUND"
            ? "NOT_FOUND"
            : "BAD_REQUEST";

    throw new TRPCError({ code, message: error.message });
  }

  if (error instanceof TRPCError) {
    throw error;
  }

  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
