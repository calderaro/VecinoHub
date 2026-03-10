# QA Checklist

## Regression Gates
- `npm run lint` passes.
- `npm run build` passes.
- `npm run db:migrate` applies successfully on a clean DB.

## Auth and Base Navigation
- Signed-out users hitting `/dashboard`, `/admin`, `/platform` redirect to `/login`.
- Signed-in users can open `UserMenu` and sign out from any page header using it.
- Sign-up requires email OTP verification before access to `/dashboard`.
- Unverified users attempting password login receive a new verification OTP and can complete verification from `/login`.
- Password reset completes from `/forgot-password` with email OTP, new password, and password confirmation, then signs the user in and redirects to `/dashboard`.

## Role Access Matrix
- Platform admin can access `/platform` and `/admin/*`.
- Neighborhood admin cannot access `/platform`.
- Neighborhood admin can access `/admin` and domain modules in authorized neighborhoods.
- Regular neighbor cannot access `/admin/*` or `/platform`.

## Multi-Neighborhood Isolation
- Platform admin can create a new neighborhood in `/platform`.
- Platform admin can open `/platform/[neighborhoodId]`, edit the neighborhood, and delete it from the detail screen.
- Platform admin can add an existing user to a neighborhood and change neighborhood membership role/status from `/platform/[neighborhoodId]`.
- Neighborhood admin cannot create neighborhoods.
- Neighborhood admin of Neighborhood A cannot read/update Neighborhood B data.
- Polls/events/posts/campaigns lists are scoped to active neighborhood context for non-platform users.
- Group member operations reject cross-neighborhood group/user combinations.

## Active Neighborhood Context
- User with memberships in multiple neighborhoods can switch neighborhood in `UserMenu`.
- Switching neighborhood updates dashboard route behavior (`/dashboard` resolves to group in selected neighborhood).
- Clearing active context (platform admin) returns to global scope behavior.

## Feature Flows
 - Groups: create/edit/delete, including creating an empty group with no members, plus member add/remove and group role changes respect permissions.
- Group members remain read-only in `/dashboard/[groupId]/members`.
- Group admins can update group details and manage members/roles only for their own group.
- Neighborhood admins and platform admins can manage group members and roles in authorized neighborhoods.
- Neighborhood admins opening `/admin/[neighborhoodId]/users` only see users who hold at least one active group membership in that neighborhood.
- `/admin/[neighborhoodId]/members` only lists users with the `neighborhood_admin` role.
- Neighborhood admins can assign a neighborhood role to an existing user from the dialog in `/admin/[neighborhoodId]/members`, then promote/demote neighborhood admins there.
- `/admin/[neighborhoodId]/members` provides dialog-based edit and remove actions for each listed neighborhood admin.
- Polls: draft -> active -> closed lifecycle still works; one vote per group per poll enforced.
- Fundraising: create campaign, submit contribution, confirm/reject still work.
- Events: create/edit/delete and list/detail render correctly.
- Posts: create/edit/publish/unpublish/delete flows work.
- Profile update (username/language) still works.

## UI and Accessibility
- New/updated UI includes test ids:
  - platform neighborhood creation/list
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
