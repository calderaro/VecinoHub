-- Rename payment_method enum to contribution_method
ALTER TYPE "payment_method" RENAME TO "contribution_method";

-- Rename payment_report_status enum to contribution_status
ALTER TYPE "payment_report_status" RENAME TO "contribution_status";

-- Rename payment_request_status enum to campaign_status
ALTER TYPE "payment_request_status" RENAME TO "campaign_status";

-- Rename payment_requests table to fundraising_campaigns
ALTER TABLE "payment_requests" RENAME TO "fundraising_campaigns";

-- Rename payment_reports table to fundraising_contributions
ALTER TABLE "payment_reports" RENAME TO "fundraising_contributions";

-- Rename the payment_request_id column in fundraising_contributions
ALTER TABLE "fundraising_contributions" RENAME COLUMN "payment_request_id" TO "campaign_id";

-- Rename indexes on fundraising_contributions
ALTER INDEX "payment_reports_request_id_idx" RENAME TO "fundraising_contributions_campaign_id_idx";
ALTER INDEX "payment_reports_group_id_idx" RENAME TO "fundraising_contributions_group_id_idx";
