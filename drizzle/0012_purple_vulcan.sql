CREATE TYPE "public"."group_role" AS ENUM('group_member', 'group_admin');--> statement-breakpoint
DROP INDEX "groups_admin_user_id_idx";--> statement-breakpoint
ALTER TABLE "group_memberships" ADD COLUMN "role" "group_role" DEFAULT 'group_member' NOT NULL;--> statement-breakpoint
INSERT INTO "group_memberships" ("group_id", "user_id", "role", "status")
SELECT "id", "admin_user_id", 'group_admin', 'active'
FROM "groups"
WHERE "admin_user_id" IS NOT NULL
ON CONFLICT ("group_id", "user_id") DO UPDATE
SET "role" = 'group_admin',
    "status" = 'active',
    "updated_at" = now();--> statement-breakpoint
CREATE INDEX "group_memberships_group_role_idx" ON "group_memberships" USING btree ("group_id","role");--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "admin_user_id";
