CREATE TYPE "public"."help_feedback_response" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "help_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"screen_key" text,
	"article_slug" text,
	"source" text,
	"query" text,
	"result_count" integer,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_slug" text NOT NULL,
	"response" "help_feedback_response" NOT NULL,
	"comment" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "help_events_user_created_at_idx" ON "help_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "help_events_event_name_idx" ON "help_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "help_events_article_slug_idx" ON "help_events" USING btree ("article_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "help_feedback_user_article_unique" ON "help_feedback" USING btree ("user_id","article_slug");--> statement-breakpoint
CREATE INDEX "help_feedback_article_slug_idx" ON "help_feedback" USING btree ("article_slug");