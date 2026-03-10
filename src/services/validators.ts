import { z } from "zod";

export const idSchema = z.string().uuid();
export const systemRoleSchema = z.enum(["user", "admin", "platform_admin"]);
export const roleSchema = systemRoleSchema;
export const neighborhoodRoleSchema = z.enum(["neighbor", "neighborhood_admin"]);
export const groupRoleSchema = z.enum(["group_member", "group_admin"]);
export const neighborhoodStatusSchema = z.enum(["active", "inactive"]);
export const statusSchema = z.enum(["active", "inactive"]);
export const preferredLanguageSchema = z.enum(["es", "en"]);
export const contributionMethodSchema = z.enum(["cash", "wire_transfer"]);
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
