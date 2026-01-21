DROP INDEX IF EXISTS "users_email_unique";--> statement-breakpoint
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "goal_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_options" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "poll_options" ADD COLUMN IF NOT EXISTS "amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree (lower("email"));