CREATE TYPE "public"."group_access_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "group_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "group_access_request_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "group_access_requests_pending_group_user_unique" ON "group_access_requests" USING btree ("group_id","requested_by") WHERE "group_access_requests"."status" = 'pending'::group_access_request_status;--> statement-breakpoint
CREATE INDEX "group_access_requests_group_status_idx" ON "group_access_requests" USING btree ("group_id","status");--> statement-breakpoint
CREATE INDEX "group_access_requests_neighborhood_status_idx" ON "group_access_requests" USING btree ("neighborhood_id","status");--> statement-breakpoint
CREATE INDEX "group_access_requests_requested_by_status_idx" ON "group_access_requests" USING btree ("requested_by","status");--> statement-breakpoint
CREATE INDEX "group_access_requests_expires_at_idx" ON "group_access_requests" USING btree ("expires_at");