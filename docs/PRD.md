# Product Requirements Document — VecinoHub

## 1) Overview
VecinoHub is a multi-neighborhood administration web app where residents (organized by house groups) can manage membership, vote on polls, submit fundraising contributions, and consume neighborhood announcements/events.

Stack: Next.js, tRPC, SuperJSON, Tailwind, TypeScript, Drizzle, PostgreSQL, better-auth.

## 2) Goals
- Support multiple neighborhoods in a single deployment.
- Introduce a clear 3-level access model:
  - `platform_admin` (global management)
  - `neighborhood_admin` (management scoped to one neighborhood)
  - `neighbor` (resident experience)
- Keep resident dashboard flows intact while enforcing strict tenant isolation.
- Preserve group-level delegation with `groups.admin_user_id` for membership operations.

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

### Group delegation
- `groups.admin_user_id` remains active for local member management.

## 5) Core Entities
- `users`
- `neighborhoods`
- `neighborhood_memberships`
- `groups`
- `group_memberships`
- `polls`, `poll_options`, `votes`
- `fundraising_campaigns`, `fundraising_contributions`
- `events`
- `posts`

All domain entities (`groups`, `polls`, `fundraising_campaigns`, `events`, `posts`) are neighborhood-scoped.

## 6) Core Flows

### Platform administration
- Create and update neighborhoods.
- Assign/revoke neighborhood admin role through neighborhood memberships.
- Manage global user system roles and statuses.

### Neighborhood administration
- Manage groups and group memberships within authorized neighborhoods only.
- Manage neighborhood polls, campaigns, events, and posts.
- Read and operate only within their neighborhood boundaries.

### Resident dashboard
- Access dashboard only for groups where user is an active member.
- View and participate in neighborhood-scoped polls, fundraising, events, and posts.
- Update own profile and switch active neighborhood context when member of multiple neighborhoods.

## 7) Permission Summary
- `platform_admin`: full cross-neighborhood read/write and user role management.
- `neighborhood_admin`: CRUD for neighborhood content and group management only in authorized neighborhoods.
- `neighbor`: read/participate flows for own neighborhood/group permissions.
- `group admin`: member add/remove only in owned group.

## 8) Route Model
- Resident: `/dashboard`, `/dashboard/[groupId]/*`
- Neighborhood admin shell: `/admin/*`
- Platform admin shell: `/platform/*`

## 9) Success Criteria
- Platform admin can create/manage neighborhoods.
- Neighborhood admins cannot access or modify foreign neighborhood data.
- Residents cannot access admin/platform shells.
- No cross-tenant leaks in service-level read/write flows.
- `npm run lint` and `npm run build` pass after migration and refactor.

## 10) Open Follow-ups
- Whether legacy `admin` system role compatibility should be fully removed after transition window.
- Whether route-level neighborhood slug (`/n/[slug]`) should become canonical in a future release.
