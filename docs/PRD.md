# Product Requirements Document — VecinoHub

## 1) Overview
Build a neighborhood administration web app where residents (organized by house groups) can manage membership, vote on polls, and report/confirm shared payments (cash or wire transfer). Product name: VecinoHub. Stack: Next.js, tRPC, SuperJSON, Tailwind, TypeScript, Drizzle, shadcn/ui, PostgreSQL, better-auth.

## 2) Goals
- Allow secure email-based registration and login.
- Manage residents by house groups with clear role-based access.
- Enable group-based voting.
- Track payment requests and confirmations (wire transfer or cash).

## 3) Non-Goals (for now)
- Payment processing integrations.
- Advanced permissions or custom roles beyond user/admin.
- Mobile apps.

## 4) Users & Roles (MVP)
- **User**: basic access; view own groups; submit payment proof.
- **Admin**: system-level admin; manage users, groups, polls, payment requests, and confirmations.

House group roles:
- Each group (house) has a **Group Admin** who can add/remove members in their group.

## 5) Core Entities
- **User**: email, name, role (user/admin), status, auth identity.
- **House Group**: name/identifier, address (optional), group admin.
- **Group Membership**: user + group + status. Users may belong to multiple groups.
- **Poll**: title, description, options, status (draft/active/closed), createdBy.
- **Vote**: groupId + pollId + choice (one per group).
- **Payment Request**: title, description, amount, due date, createdBy.
- **Payment Report**: groupId + paymentRequestId + submittedBy + method (cash/wire transfer) + status (submitted/confirmed/rejected) + confirmedBy + proof details.

Wire transfer proof details:
- Reference number
- Date
- Amount

## 6) Key Flows
### Registration/Login
- Email-based signup via better-auth.
- User assigned default role (user) until elevated by admin.

### Group Management
- Admin creates house groups.
- Admin assigns a group admin.
- Group admin adds/removes members in their group.

### Voting
- Admin creates poll.
- Each house group can cast one vote.
- Votes are visible to admins; group sees their own vote status.

### Payment Request & Confirmation
- Admin creates payment request.
- House group member submits payment report (cash or wire transfer details).
- Admin confirms or rejects payment reports.

## 7) Permissions Matrix (High Level)
- **User**: view own groups; submit payment reports.
- **Admin**: full access.
- **Group Admin**: manage membership in their group.

## 8) MVP Screens
- Auth (login/register)
- Dashboard (role-based summary)
- Group page (members, role actions)
- Polls (list, view, vote, results)
- Payment Requests (list, report payment, admin confirm)

## 9) Data & API
- API via tRPC, serialized with SuperJSON.
- DB via Drizzle + Postgres.
- Core tables: users, groups, memberships, polls, poll_options, votes, payment_requests, payment_reports.

## 10) Auditing & History
- Track createdBy and confirmedBy on sensitive actions.
- Preserve payment report history (no hard delete).

## 11) Success Metrics
- % of houses with assigned group admin.
- Poll participation rate by group.
- Time to confirm payment reports.

## 12) Open Questions
- Should group admins also be allowed to create polls or payment requests in MVP?
- Should users see other groups they belong to in a combined dashboard or separate views?
- What minimum details are required for cash payment proof?
