# QA Checklist

## Regression Gates
- `npm run lint` passes.
- `npm run build` passes.
- `npm test` passes.
- Single test runs with `npm test -- tests/services/fundraising.test.ts`.
- `npm run db:migrate` applies successfully on a clean DB.

## Auth and Base Navigation
- Signed-out users hitting `/dashboard`, `/admin`, `/platform` redirect to `/login`.
- Signed-in users can open `UserMenu` and sign out from any page header using it.
- Sign-up requires email OTP verification before access to `/dashboard`.
- Unverified users attempting password login receive a new verification OTP and can complete verification from `/login`.
- Password reset completes from `/forgot-password` with email OTP, new password, and password confirmation, then signs the user in and redirects to `/dashboard`.
- Auth flows fail without leaking OTPs or sign-in/reset links when SMTP is not configured.
- Repeated password and magic-link attempts hit rate limiting instead of succeeding indefinitely.
- Sign in, refresh, and sign out still work with Redis-backed sessions after setting `REDIS_URL`.
- Inactive users are denied access after deactivation, even if they had an existing session before the status change.
- Inactive users cannot create new sessions through password, magic-link, OTP, or social sign-in flows.

## Role Access Matrix
- Platform admin can access `/platform` and `/admin/*`.
- Neighborhood admin cannot access `/platform`.
- Neighborhood admin can access `/admin` and domain modules in authorized neighborhoods.
- Regular neighbor cannot access `/admin/*` or `/platform`.

## Multi-Neighborhood Isolation
- Platform admin can create a new neighborhood in `/platform`.
- Platform admin can open `/platform/[neighborhoodId]`, edit the neighborhood, and delete it from the detail screen.
- Platform admin can add an existing user to a neighborhood and change neighborhood membership role/status from `/platform/[neighborhoodId]`.
- Platform admin can open `/platform/users`, search/filter all accounts, and navigate to `/platform/users/[userId]`.
- Platform admin can update platform user role/status from `/platform/users/[userId]`, and deactivation ends active sessions immediately.
- Platform admin can open `/platform/users/[userId]/edit`, update name/username/language, and return to the detail page with the new profile values shown.
- Neighborhood admin cannot create neighborhoods.
- Neighborhood admin of Neighborhood A cannot read/update Neighborhood B data.
- Polls/events/posts/campaigns lists are scoped to active neighborhood context for non-platform users.
- Residents cannot open `/dashboard/[groupId]/fundraising/[campaignId]` for a campaign outside an active neighborhood/group relationship.
- Group member operations reject cross-neighborhood group/user combinations.
- Removing or inactivating a neighborhood membership immediately revokes stale group-admin manage access in that neighborhood.
- Removing or inactivating a neighborhood membership also revokes stale read access to group detail and member lists.

## Active Neighborhood Context
- User with memberships in multiple neighborhoods can switch neighborhood in `UserMenu`.
- Switching neighborhood updates dashboard route behavior (`/dashboard` resolves to group in selected neighborhood).
- Clearing active context (platform admin) returns to global scope behavior.

## Feature Flows
- Groups: create/edit/delete, including creating a group with an optional initial admin email, creating an empty group with no members, plus member add/remove and group role changes respect permissions.
- Group members remain read-only in `/dashboard/[groupId]/members`.
- Group admins can update group details and manage members/roles only for their own group.
- Neighborhood admins and platform admins can manage group members and roles in authorized neighborhoods.
- Neighborhood admins opening `/admin/[neighborhoodId]/users` only see users who hold at least one active group membership in that neighborhood.
- `/admin/[neighborhoodId]/users` does not show a role column or role filter, and search/status filters still work.
- Neighborhood admins can open `/admin/[neighborhoodId]/users/[userId]` and only see memberships for the current neighborhood.
- `/admin/[neighborhoodId]/users/[userId]` is read-only and does not expose edit or role/status action controls.
- `/admin/[neighborhoodId]/members` only lists users with the `neighborhood_admin` role.
- Neighborhood admins can assign a neighborhood role to an existing user from the dialog in `/admin/[neighborhoodId]/members`, then promote/demote neighborhood admins there.
- `/admin/[neighborhoodId]/members` provides dialog-based edit and remove actions for each listed neighborhood admin.
- Polls: draft -> active -> closed lifecycle still works; one vote per group per poll enforced.
- Poll voting rejects option ids that belong to a different poll and preserves the existing valid vote.
- Fundraising: create campaign, submit contribution, confirm/reject still work.
- Resident campaign detail only shows contributions submitted by the signed-in user for the selected group.
- Former or inactive group memberships do not expose contributions in fundraising detail pages.
- Re-adding a neighborhood membership does not automatically restore prior group memberships or group-admin access.
- Events: create/edit/delete and list/detail render correctly.
- Posts: create/edit/publish/unpublish/delete flows work.
- Profile update (full name/username/language) still works.
- Neighbor dashboard pages and shared resident components render correctly in both Spanish and English after switching language from `/profile`.

## UI and Accessibility
- New/updated UI includes test ids:
  - platform neighborhood creation/list
  - platform global users list/detail
  - platform neighborhood detail/edit/delete
  - platform neighborhood membership management
  - neighborhood admin members management
  - neighborhood switcher entries in `UserMenu`
- Keyboard close (`Esc`) still closes `UserMenu`.
- Responsive checks on:
  - `/dashboard/[groupId]`
  - `/profile`
  - `/admin`
  - `/platform`
