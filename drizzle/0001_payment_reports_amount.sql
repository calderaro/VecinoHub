ALTER TABLE "payment_reports" ADD COLUMN "amount" numeric(12, 2) DEFAULT 0;
--> statement-breakpoint
UPDATE "payment_reports" SET "amount" = COALESCE("wire_amount", 0) WHERE "amount" IS NULL;
--> statement-breakpoint
ALTER TABLE "payment_reports" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "payment_reports_request_group_unique";
