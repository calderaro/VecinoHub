ALTER TABLE "payment_requests" ADD COLUMN "goal_amount" numeric(12, 2);
--> statement-breakpoint
UPDATE "payment_requests"
SET "goal_amount" = "amount" * COALESCE(
  (SELECT COUNT(DISTINCT "group_id")
   FROM "group_memberships"
   WHERE "status" = 'active'),
  1
);
--> statement-breakpoint
ALTER TABLE "payment_requests" ALTER COLUMN "goal_amount" SET NOT NULL;
