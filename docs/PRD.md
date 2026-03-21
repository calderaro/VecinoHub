# Product Requirements Document — VecinoHub

## 1) Overview
VecinoHub is a multi-neighborhood administration web app where residents (organized by house groups) can manage membership, vote on polls, submit fundraising contributions, manage neighborhood funds, and consume neighborhood announcements/events.

Stack: Next.js, tRPC, SuperJSON, Tailwind, TypeScript, Drizzle, PostgreSQL, better-auth.

## 2) Goals
- Support multiple neighborhoods in a single deployment.
- Introduce a clear 3-level access model:
  - `platform_admin` (global management)
  - `neighborhood_admin` (management scoped to one neighborhood)
  - `neighbor` (resident experience)
- Keep resident dashboard flows intact while enforcing strict tenant isolation.
- Preserve group-level delegation with per-group membership roles.

## 3) Non-Goals (Current Iteration)
- Billing, tenant provisioning APIs, or per-neighborhood custom domains.
- Custom role builders beyond platform/neighborhood/group scope.
- Native mobile applications.

## 4) User and Role Model

### System role (`users.role`)
- `user`
- `platform_admin`

### Neighborhood membership role (`neighborhood_memberships.role`)
- `neighbor`
- `neighborhood_admin`

### Group membership role (`group_memberships.role`)
- `group_member`
- `group_admin`

## 5) Core Entities
- `users`
- `neighborhoods`
- `neighborhood_memberships`
- `groups`
- `group_memberships`
- `polls`, `poll_options`, `votes`
- `fundraising_campaigns`, `fundraising_contributions`
- `neighborhood_funds`, `fund_charge_templates`, `fund_charge_periods`
- `fund_group_charges`, `fund_payment_submissions`, `fund_payment_allocations`, `fund_movements`
- `events`
- `posts`

All domain entities (`groups`, `polls`, `fundraising_campaigns`, `neighborhood_funds`, `fund_charge_templates`, `fund_charge_periods`, `events`, `posts`) are neighborhood-scoped.

## 6) Core Flows

### Platform administration
- Create and update neighborhoods.
- Assign/revoke neighborhood admin role through neighborhood memberships.
- Manage global user system roles and statuses.

### Neighborhood administration
- Manage groups and group memberships within authorized neighborhoods only.
- Manage neighborhood polls, campaigns, funds, events, and posts.
- Manage multiple named funds, dues, payment confirmations, and fund movements.
- Read and operate only within their neighborhood boundaries.

### Resident dashboard
- Access dashboard only for groups where user is an active member.
- View and participate in neighborhood-scoped polls, fundraising, funds, events, and posts.
- View neighborhood fund balances and confirmed movements and track paid/unpaid status by group.
- Submit fund payments for their own group.
- Update own profile and switch active neighborhood context when member of multiple neighborhoods.

## 7) Permission Summary
- `platform_admin`: full cross-neighborhood read/write and user role management.
- `neighborhood_admin`: CRUD for neighborhood content, funds, and group management only in authorized neighborhoods.
- `neighbor`: read/participate flows for own neighborhood/group permissions, including fund transparency and payment submission.
- `group_admin`: manage only their own group details, members, and group roles.
- `group_member`: read-only access for their own group.

## 8) Route Model
- Resident: `/dashboard`, `/dashboard/[groupId]/*`
- Neighborhood admin shell: `/admin/*`
- Platform admin shell: `/platform/*`

## 9) Success Criteria
- Platform admin can create/manage neighborhoods.
- Neighborhood admins cannot access or modify foreign neighborhood data.
- Residents cannot access admin/platform shells.
- No cross-tenant leaks in service-level read/write flows.
- Residents can view neighborhood fund balances and confirmed movements only in authorized neighborhoods.
- Neighborhood admins can manage multiple named funds and confirm fund payments only in their neighborhoods.
- `npm run lint` and `npm run build` pass after migration and refactor.

## 10) Open Follow-ups
- Whether legacy `admin` system role compatibility should be fully removed after transition window.
- Whether route-level neighborhood slug (`/n/[slug]`) should become canonical in a future release.
