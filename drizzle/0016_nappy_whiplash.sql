CREATE TYPE "public"."resource_block_reason" AS ENUM('maintenance', 'cleaning', 'repair', 'neighborhood_event', 'unavailable', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_reservation_status" AS ENUM('approved', 'cancelled', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "resource_availability_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"reason" "resource_block_reason" NOT NULL,
	"reason_text" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"attendee_count" integer,
	"status" "resource_reservation_status" DEFAULT 'approved' NOT NULL,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"completed_at" timestamp with time zone,
	"deposit_status" text,
	"deposit_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"min_advance_hours" integer DEFAULT 0 NOT NULL,
	"max_advance_days" integer DEFAULT 30 NOT NULL,
	"max_reservations_per_month" integer,
	"max_reservations_per_year" integer,
	"max_active_reservations" integer,
	"min_duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_duration_minutes" integer DEFAULT 360 NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"max_concurrent_reservations" integer DEFAULT 1 NOT NULL,
	"require_no_debt" boolean DEFAULT false NOT NULL,
	"cancellation_limit_hours" integer,
	"late_cancellation_counts_as_usage" boolean DEFAULT false NOT NULL,
	"late_cancellation_forfeits_deposit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text,
	"location" text,
	"capacity" integer,
	"status" "resource_status" DEFAULT 'active' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"requires_deposit" boolean DEFAULT false NOT NULL,
	"deposit_amount" numeric(12, 2),
	"reservation_fee_amount" numeric(12, 2),
	"usage_rules" text,
	"terms_text" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "neighborhoods" ADD COLUMN "time_zone" text DEFAULT 'America/Mexico_City' NOT NULL;--> statement-breakpoint
CREATE INDEX "resource_availability_windows_resource_day_idx" ON "resource_availability_windows" USING btree ("resource_id","day_of_week");--> statement-breakpoint
CREATE INDEX "resource_blocks_resource_start_idx" ON "resource_blocks" USING btree ("resource_id","start_at");--> statement-breakpoint
CREATE INDEX "resource_reservations_resource_start_idx" ON "resource_reservations" USING btree ("resource_id","start_at");--> statement-breakpoint
CREATE INDEX "resource_reservations_group_start_idx" ON "resource_reservations" USING btree ("group_id","start_at");--> statement-breakpoint
CREATE INDEX "resource_reservations_neighborhood_status_idx" ON "resource_reservations" USING btree ("neighborhood_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_rules_resource_unique" ON "resource_rules" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resources_neighborhood_id_idx" ON "resources" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_neighborhood_name_unique" ON "resources" USING btree ("neighborhood_id",lower("name"));