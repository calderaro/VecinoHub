import { z } from "zod";

export const idSchema = z.string().uuid();
export const roleSchema = z.enum(["user", "admin"]);
export const statusSchema = z.enum(["active", "inactive"]);
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
