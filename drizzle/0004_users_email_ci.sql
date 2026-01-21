UPDATE "users"
SET "email" = lower("email");

DROP INDEX IF EXISTS "users_email_unique";

CREATE UNIQUE INDEX "users_email_unique" ON "users" (lower("email"));
