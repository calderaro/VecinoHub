CREATE TYPE "public"."fund_charge_frequency" AS ENUM('monthly', 'quarterly', 'annual', 'one_off');--> statement-breakpoint
CREATE TYPE "public"."fund_charge_period_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fund_entry_side" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."fund_group_charge_status" AS ENUM('unpaid', 'partial', 'paid', 'overdue', 'waived');--> statement-breakpoint
CREATE TYPE "public"."fund_movement_type" AS ENUM('opening_balance', 'payment', 'expense', 'manual_income', 'adjustment', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."fund_payment_method" AS ENUM('cash', 'wire_transfer');--> statement-breakpoint
CREATE TYPE "public"."fund_payment_status" AS ENUM('submitted', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."fund_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."fund_template_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE "fund_charge_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"template_id" uuid,
	"neighborhood_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_per_group" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "fund_charge_period_status" DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_charge_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "fund_template_status" DEFAULT 'active' NOT NULL,
	"frequency" "fund_charge_frequency" NOT NULL,
	"default_amount" numeric(12, 2) NOT NULL,
	"due_day_of_month" integer,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_group_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"amount_due" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "fund_group_charge_status" DEFAULT 'unpaid' NOT NULL,
	"waived_by" uuid,
	"waived_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"type" "fund_movement_type" NOT NULL,
	"entry_side" "fund_entry_side" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"group_charge_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_payment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"group_charge_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"method" "fund_payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_at" date NOT NULL,
	"reference" text,
	"notes" text,
	"status" "fund_payment_status" DEFAULT 'submitted' NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhood_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neighborhood_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"currency_code" text DEFAULT 'MXN' NOT NULL,
	"status" "fund_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fund_charge_periods_fund_id_idx" ON "fund_charge_periods" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "fund_charge_periods_template_id_idx" ON "fund_charge_periods" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "fund_charge_periods_neighborhood_id_idx" ON "fund_charge_periods" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "fund_charge_periods_due_date_idx" ON "fund_charge_periods" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "fund_charge_templates_fund_id_idx" ON "fund_charge_templates" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "fund_charge_templates_neighborhood_id_idx" ON "fund_charge_templates" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fund_group_charges_period_group_unique" ON "fund_group_charges" USING btree ("period_id","group_id");--> statement-breakpoint
CREATE INDEX "fund_group_charges_period_id_idx" ON "fund_group_charges" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "fund_group_charges_group_id_idx" ON "fund_group_charges" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "fund_group_charges_status_idx" ON "fund_group_charges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fund_movements_fund_id_idx" ON "fund_movements" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "fund_movements_neighborhood_id_idx" ON "fund_movements" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "fund_movements_effective_at_idx" ON "fund_movements" USING btree ("effective_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fund_payment_allocations_payment_charge_unique" ON "fund_payment_allocations" USING btree ("payment_id","group_charge_id");--> statement-breakpoint
CREATE INDEX "fund_payment_allocations_payment_id_idx" ON "fund_payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "fund_payment_allocations_group_charge_id_idx" ON "fund_payment_allocations" USING btree ("group_charge_id");--> statement-breakpoint
CREATE INDEX "fund_payment_submissions_fund_id_idx" ON "fund_payment_submissions" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "fund_payment_submissions_neighborhood_id_idx" ON "fund_payment_submissions" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "fund_payment_submissions_group_charge_id_idx" ON "fund_payment_submissions" USING btree ("group_charge_id");--> statement-breakpoint
CREATE INDEX "fund_payment_submissions_group_id_idx" ON "fund_payment_submissions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "fund_payment_submissions_status_idx" ON "fund_payment_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "neighborhood_funds_neighborhood_id_idx" ON "neighborhood_funds" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE UNIQUE INDEX "neighborhood_funds_neighborhood_name_unique" ON "neighborhood_funds" USING btree ("neighborhood_id",lower("name"));