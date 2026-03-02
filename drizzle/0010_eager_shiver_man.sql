CREATE TYPE "public"."neighborhood_membership_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."neighborhood_role" AS ENUM('neighbor', 'neighborhood_admin');--> statement-breakpoint
CREATE TYPE "public"."neighborhood_status" AS ENUM('active', 'inactive');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'platform_admin';--> statement-breakpoint
CREATE TABLE "neighborhood_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neighborhood_id" uuid,
	"user_id" uuid NOT NULL,
	"role" "neighborhood_role" DEFAULT 'neighbor' NOT NULL,
	"status" "neighborhood_membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "neighborhood_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "neighborhood_id" uuid;--> statement-breakpoint
ALTER TABLE "fundraising_campaigns" ADD COLUMN "neighborhood_id" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "neighborhood_id" uuid;--> statement-breakpoint
ALTER TABLE "polls" ADD COLUMN "neighborhood_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "neighborhood_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "neighborhood_memberships_neighborhood_user_unique" ON "neighborhood_memberships" USING btree ("neighborhood_id","user_id");--> statement-breakpoint
CREATE INDEX "neighborhood_memberships_neighborhood_id_idx" ON "neighborhood_memberships" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "neighborhood_memberships_user_id_idx" ON "neighborhood_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "neighborhood_memberships_neighborhood_role_idx" ON "neighborhood_memberships" USING btree ("neighborhood_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "neighborhoods_slug_unique" ON "neighborhoods" USING btree (lower("slug"));--> statement-breakpoint
CREATE INDEX "neighborhoods_status_idx" ON "neighborhoods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_neighborhood_id_idx" ON "events" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "fundraising_campaigns_neighborhood_id_idx" ON "fundraising_campaigns" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "groups_neighborhood_id_idx" ON "groups" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "polls_neighborhood_id_idx" ON "polls" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "posts_neighborhood_id_idx" ON "posts" USING btree ("neighborhood_id");