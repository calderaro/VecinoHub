# VecinoHub Implementation Plan

This plan is ordered to minimize conflicts and keep dependencies clear. Each task is small enough to mark as done.

## Architecture Notes (Guiding Rules)
- **SSR-first**: prefer server-side data access for read-only queries.
- **tRPC for mutations**: all writes go through tRPC routers.
- **Services layer**: all business logic, validation, and DB access live in `src/services/`.
- **Pages read pattern**: server components/pages call services directly for SSR; avoid unnecessary client fetching.
- **Validation**: use Zod for input validation in services and tRPC.

## 0) Project Setup
- [x] Confirm repo structure and create baseline folders (src, tests, docs as needed).
- [x] Add `.gitignore` entries for env files, build artifacts, and editor files.
- [x] Define environment variable template in `.env.example`.
- [x] Add basic README with local setup instructions.
- [x] Link docs in README: `ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md`, `SCREENS.md`, `PERMISSIONS.md`, `SEEDING.md`, `QA.md`.

## 1) Stack Initialization
- [x] Initialize Next.js app (TypeScript, app router).
- [x] Install core dependencies: tRPC, SuperJSON, Tailwind, Drizzle, PostgreSQL client, better-auth, React Query.
- [x] Configure Tailwind and base styles.
- [ ] Initialize shadcn/ui and add core UI primitives (button, input, dialog, table, select, badge).
- [x] Set up Drizzle config and migrations folder.

## 2) Auth & User Model
- [x] Define initial database schema for users (role, status, timestamps).
- [x] Set up better-auth configuration and session handling.
- [x] Implement email signup/login flow.
- [x] Create server-side auth helpers (getSession).
- [x] Add role enum (user/admin) and seed an initial admin account (via seed script).

## 3) Core Domain Schema (Drizzle)
- [x] Create tables: groups (houses), memberships, polls, poll_options, votes, payment_requests, payment_reports.
- [x] Add constraints and indexes (unique vote per group per poll, unique membership per user per group).
- [x] Add enum for payment method (cash, wire_transfer) and report status (submitted, confirmed, rejected).
- [ ] Add foreign keys and timestamps.
- [x] Create initial migration and apply to local database.
- [x] Keep schema aligned with `docs/DATA_MODEL.md`.

## 4) tRPC Foundation
- [x] Set up tRPC router with SuperJSON transformer.
- [x] Add auth middleware to tRPC context.
- [x] Implement base error handling and input validation.
- [x] Create shared zod schemas for IDs, pagination, and enums.
- [x] Document rule: all mutations must go through tRPC (no direct DB access in routes/pages).
- [x] Keep routers aligned with `docs/API.md` and update docs on changes.

## 4.1) Services Layer Foundation
- [x] Create `src/services/` with domain modules (auth, groups, polls, payments, users).
- [x] Define service patterns: input validation, DB access, and business logic in services only.
- [x] Add service helpers for pagination, filters, and shared errors.

## 5) User & Admin Management
- [x] Admin: list users with roles and group memberships.
- [x] Admin: update user role (user/admin).
- [x] Admin: deactivate/activate user account.

## 6) Groups (Houses)
- [x] Admin: create/edit/delete group.
- [x] Admin: assign group admin.
- [x] Group admin: add/remove members.
- [x] User: view their groups and group members.
- [x] Pages: use services directly for SSR read-only group data.

## 7) Polls & Voting
- [x] Admin: create/edit/close polls.
- [x] Admin: manage poll options (draft-only).
- [x] Admin: launch, re-open, and reset polls.
- [x] Group member: cast vote for their group (one per group, overwrite until closed).
- [x] User: view poll status and their group’s vote.
- [x] Admin: view results summary + participation.
- [x] Pages: use services directly for SSR read-only poll data.

## 8) Payment Requests & Reports
- [x] Admin: create/edit/close payment requests.
- [x] Admin: goal-based requests (per-group amount derived from active groups).
- [x] User: submit payment report (cash or wire transfer).
- [x] User: for wire transfer, require reference number and date.
- [x] User: can submit multiple reports per request and delete while open.
- [x] Admin: update payment report status (confirm/reject/edit).
- [ ] User: view report status history.
- [x] Pages: use services directly for SSR read-only payment data.

## 9) UI/UX Pages
- [x] Auth pages (login, register).
- [x] Dashboard with role-based widgets.
- [x] Groups page (list + detail + membership management).
- [x] Polls page (list + detail + vote form + results).
- [x] Payments page (requests + submit report + admin confirmations).
- [x] Admin panel (users, groups, polls, payments).
- [x] Add app navigation and shared layout.
- [x] Dual UI: neighbor dashboard at `/dashboard/:groupId`, admin UI at `/admin`.
- [x] Keep page coverage aligned with `docs/SCREENS.md`.

## 10) Access Control & Guards
- [x] Route protection for authenticated pages.
- [x] Admin-only routes and components.
- [x] Group admin permissions for membership changes.
- [x] Server-side permission checks for all mutations.
- [x] Validate permissions against `docs/PERMISSIONS.md` (audit before release).

## 11) Notifications & Audit (MVP-light)
- [x] Add audit fields (createdBy, confirmedBy).
- [ ] Add basic activity feed for admins (optional for MVP).

## 12) Testing & QA
- [ ] Unit tests for permissions and critical mutations.
- [ ] Integration tests for auth + core flows (poll vote, payment report).
- [ ] Manual QA checklist for MVP flows.
- [ ] Keep QA coverage aligned with `docs/QA.md`.

## 12.1) Seeding
- [x] Implement seed script based on `docs/SEEDING.md`.
- [x] Add seed command to package scripts.

## 13) Deployment Prep
- [ ] Add production env vars documentation.
- [ ] Database migration procedure doc.
- [ ] Basic monitoring/logging setup notes.

## 14) Future Roles (Post-MVP)
- [ ] Add reader and writer roles.
- [ ] Expand permission matrix and UI controls.
- [ ] Add role upgrade/downgrade workflows.
