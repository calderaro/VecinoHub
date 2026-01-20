# VecinoHub Implementation Plan

This plan is ordered to minimize conflicts and keep dependencies clear. Each task is small enough to mark as done.

## Architecture Notes (Guiding Rules)
- **SSR-first**: prefer server-side data access for read-only queries.
- **tRPC for mutations**: all writes go through tRPC routers.
- **Services layer**: all business logic, validation, and DB access live in `src/services/`.
- **Pages read pattern**: server components/pages call services directly for SSR; avoid unnecessary client fetching.

## 0) Project Setup
- [ ] Confirm repo structure and create baseline folders (src, tests, docs as needed).
- [ ] Add `.gitignore` entries for env files, build artifacts, and editor files.
- [ ] Define environment variable template in `.env.example`.
- [ ] Add basic README with local setup instructions.

## 1) Stack Initialization
- [ ] Initialize Next.js app (TypeScript, app router).
- [ ] Install core dependencies: tRPC, SuperJSON, Tailwind, shadcn/ui, Drizzle, PostgreSQL client, better-auth.
- [ ] Configure Tailwind and base styles.
- [ ] Initialize shadcn/ui and add core UI primitives (button, input, dialog, table, select, badge).
- [ ] Set up Drizzle config and migrations folder.

## 2) Auth & User Model
- [ ] Define initial database schema for users (role, status, timestamps).
- [ ] Set up better-auth configuration and session handling.
- [ ] Implement email signup/login flow.
- [ ] Create server-side auth helpers (getSession, requireAuth).
- [ ] Add role enum (user/admin) and seed an initial admin account (manual or script).

## 3) Core Domain Schema (Drizzle)
- [ ] Create tables: groups (houses), memberships, polls, poll_options, votes, payment_requests, payment_reports.
- [ ] Add constraints and indexes (unique vote per group per poll, unique membership per user per group).
- [ ] Add enum for payment method (cash, wire_transfer) and report status (submitted, confirmed, rejected).
- [ ] Add foreign keys and timestamps.
- [ ] Create initial migration and apply to local database.

## 4) tRPC Foundation
- [ ] Set up tRPC router with SuperJSON transformer.
- [ ] Add auth middleware to tRPC context.
- [ ] Implement base error handling and input validation.
- [ ] Create shared zod schemas for IDs, pagination, and enums.
 - [ ] Document rule: all mutations must go through tRPC (no direct DB access in routes/pages).

## 4.1) Services Layer Foundation
- [ ] Create `src/services/` with domain modules (auth, groups, polls, payments, users).
- [ ] Define service patterns: input validation, DB access, and business logic in services only.
- [ ] Add service helpers for pagination, filters, and shared errors.

## 5) User & Admin Management
- [ ] Admin: list users with roles and group memberships.
- [ ] Admin: update user role (user/admin).
- [ ] Admin: deactivate/activate user account.

## 6) Groups (Houses)
- [ ] Admin: create/edit/delete group.
- [ ] Admin: assign group admin.
- [ ] Group admin: add/remove members.
- [ ] User: view their groups and group members.
 - [ ] Pages: use services directly for SSR read-only group data.

## 7) Polls & Voting
- [ ] Admin: create/edit/close polls.
- [ ] Admin: manage poll options.
- [ ] Group member: cast vote for their group (one per group).
- [ ] User: view poll status and their group’s vote.
- [ ] Admin: view results summary.
 - [ ] Pages: use services directly for SSR read-only poll data.

## 8) Payment Requests & Reports
- [ ] Admin: create/edit/close payment requests.
- [ ] User: submit payment report (cash or wire transfer).
- [ ] User: for wire transfer, require reference number, date, and amount.
- [ ] Admin: confirm or reject payment reports.
- [ ] User: view report status history.
 - [ ] Pages: use services directly for SSR read-only payment data.

## 9) UI/UX Pages
- [ ] Auth pages (login, register).
- [ ] Dashboard with role-based widgets.
- [ ] Groups page (list + detail + membership management).
- [ ] Polls page (list + detail + vote form + results).
- [ ] Payments page (requests + submit report + admin confirmations).
- [ ] Admin panel (users, groups, polls, payments).

## 10) Access Control & Guards
- [ ] Route protection for authenticated pages.
- [ ] Admin-only routes and components.
- [ ] Group admin permissions for membership changes.
- [ ] Server-side permission checks for all mutations.

## 11) Notifications & Audit (MVP-light)
- [ ] Add audit fields (createdBy, updatedBy, confirmedBy).
- [ ] Add basic activity feed for admins (optional for MVP).

## 12) Testing & QA
- [ ] Unit tests for permissions and critical mutations.
- [ ] Integration tests for auth + core flows (poll vote, payment report).
- [ ] Manual QA checklist for MVP flows.

## 13) Deployment Prep
- [ ] Add production env vars documentation.
- [ ] Database migration procedure doc.
- [ ] Basic monitoring/logging setup notes.

## 14) Future Roles (Post-MVP)
- [ ] Add reader and writer roles.
- [ ] Expand permission matrix and UI controls.
- [ ] Add role upgrade/downgrade workflows.
