# Product Requirements Document — VecinoHub

## 1) Overview
Build a neighborhood administration web app where residents (organized by house groups) can manage membership, vote on polls, and report/confirm fundraising contributions (cash or wire transfer). Product name: VecinoHub. Stack: Next.js, tRPC, SuperJSON, Tailwind, TypeScript, Drizzle, shadcn/ui, PostgreSQL, better-auth.

## 2) Goals
- Allow secure email-based registration and login.
- Allow users to configure a public username and profile photo for display.
- Manage residents by house groups with clear role-based access.
- Enable group-based voting.
- Track fundraising campaigns and contributions (wire transfer or cash).
 - Support goal-based campaigns with per-group amounts derived from active groups.
- Provide a shared events board for upcoming neighborhood events.
- Provide admin-authored news/posts for neighborhood-wide updates.

## 3) Non-Goals (for now)
- External payment processing integrations.
- Advanced permissions or custom roles beyond user/admin.
- Mobile apps.

## 4) Users & Roles (MVP)
- **User**: basic access; view own groups; submit contribution proof.
- **Admin**: system-level admin; manage users, groups, polls, fundraising campaigns, and confirmations.

House group roles:
- Each group (house) has a **Group Admin** who can add/remove members in their group.

## 5) Core Entities
- **User**: email, username, profile photo, name, role (user/admin), status, auth identity.
- **House Group**: name/identifier, address (optional), group admin.
- **Group Membership**: user + group + status. Users may belong to multiple groups.
- **Poll**: title, description, options, status (draft/active/closed), createdBy.
- **Poll Option**: label, optional description, optional amount.
- **Vote**: groupId + pollId + choice (one per group, overwrite allowed until closed).
- **Fundraising Campaign**: title, description, goalAmount, per-group amount (derived), due date, createdBy.
- **Fundraising Contribution**: groupId + campaignId + submittedBy + method (cash/wire transfer) + amount + status (submitted/confirmed/rejected) + confirmedBy + proof details.
- **Event**: title, description, date/time, location (optional), createdBy.
- **Post**: title, content, status (draft/published), publishedAt, createdBy.

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
- Admin creates poll (draft).
- Admin configures poll options in the poll detail view (draft only).
- Admin launches poll to active state (options locked).
- Each house group can cast one vote; subsequent votes overwrite until poll closes.
- Admin can close, re-open, or reset a poll to draft (reset clears votes).
- Votes are visible to admins; group sees their own vote status.

### Fundraising & Contributions
- Admin creates fundraising campaign with a goal amount.
- Per-group amount is derived from `goalAmount / active groups`.
- House group member submits one or more contributions (cash or wire transfer).
- Each contribution includes an amount; wire transfer requires reference + date.
- Contributions can be deleted by the submitter while the campaign is open.
- Admin confirms, rejects, or updates contribution status.

### User Profiles
- Users set a public username and profile photo.
- UI uses username/photo instead of email for display.

### Events
- Admins create events with title, date/time, and optional location.
- Users can view upcoming events.

### News/Posts
- Admins author and publish posts for neighborhood-wide updates.
- Users can read published posts.

## 7) Permissions Matrix (High Level)
- **User**: view own groups; submit contributions; update own profile; view events and posts.
- **Admin**: full access, including managing events and posts.
- **Group Admin**: manage membership in their group.

## 8) MVP Screens
- Auth (login/register)
- Dashboard (role-based summary)
- Profile settings
- Group page (members, role actions)
- Polls (list, view, vote, results)
- Fundraising (campaigns list, submit contribution, admin confirm)
- Events (list, detail)
- News/Posts (list, detail, admin editor)

## 9) Data & API
- API via tRPC, serialized with SuperJSON.
- DB via Drizzle + Postgres.
- Core tables: users, groups, memberships, polls, poll_options, votes, fundraising_campaigns, fundraising_contributions, events, posts.

## 10) Auditing & History
- Track createdBy and confirmedBy on sensitive actions.
- Preserve contribution history (no hard delete).

## 11) Success Metrics
- % of houses with assigned group admin.
- Poll participation rate by group.
- Time to confirm contributions.

## 12) Open Questions
- Should group admins also be allowed to create polls or campaigns in MVP?
- Should users see other groups they belong to in a combined dashboard or separate views?
- What minimum details are required for cash contribution proof?
