CREATE TYPE "public"."group_invite_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "group_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "group_role" DEFAULT 'group_member' NOT NULL,
	"status" "group_invite_status" DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"responded_by" uuid,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "group_invites_token_hash_unique" ON "group_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "group_invites_pending_group_email_unique" ON "group_invites" USING btree ("group_id",lower("email")) WHERE "group_invites"."status" = 'pending'::group_invite_status;--> statement-breakpoint
CREATE INDEX "group_invites_group_status_idx" ON "group_invites" USING btree ("group_id","status");--> statement-breakpoint
CREATE INDEX "group_invites_neighborhood_status_idx" ON "group_invites" USING btree ("neighborhood_id","status");--> statement-breakpoint
CREATE INDEX "group_invites_email_status_idx" ON "group_invites" USING btree (lower("email"),"status");--> statement-breakpoint
CREATE INDEX "group_invites_expires_at_idx" ON "group_invites" USING btree ("expires_at");