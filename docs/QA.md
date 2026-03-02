# QA Checklist

## Regression Gates
- `npm run lint` passes.
- `npm run build` passes.
- `npm run db:migrate` applies successfully on a clean DB.

## Auth and Base Navigation
- Signed-out users hitting `/dashboard`, `/admin`, `/platform` redirect to `/login`.
- Signed-in users can open `UserMenu` and sign out from any page header using it.

## Role Access Matrix
- Platform admin can access `/platform` and `/admin/*`.
- Neighborhood admin cannot access `/platform`.
- Neighborhood admin can access `/admin` and domain modules in authorized neighborhoods.
- Regular neighbor cannot access `/admin/*` or `/platform`.

## Multi-Neighborhood Isolation
- Platform admin can create a new neighborhood in `/platform`.
- Neighborhood admin cannot create neighborhoods.
- Neighborhood admin of Neighborhood A cannot read/update Neighborhood B data.
- Polls/events/posts/campaigns lists are scoped to active neighborhood context for non-platform users.
- Group member operations reject cross-neighborhood group/user combinations.

## Active Neighborhood Context
- User with memberships in multiple neighborhoods can switch neighborhood in `UserMenu`.
- Switching neighborhood updates dashboard route behavior (`/dashboard` resolves to group in selected neighborhood).
- Clearing active context (platform admin) returns to global scope behavior.

## Feature Flows
- Groups: create/edit/delete and member add/remove respect permissions.
- Polls: draft -> active -> closed lifecycle still works; one vote per group per poll enforced.
- Fundraising: create campaign, submit contribution, confirm/reject still work.
- Events: create/edit/delete and list/detail render correctly.
- Posts: create/edit/publish/unpublish/delete flows work.
- Profile update (username/image/language) still works.

## UI and Accessibility
- New/updated UI includes test ids:
  - platform neighborhood creation/list
  - neighborhood switcher entries in `UserMenu`
- Keyboard close (`Esc`) still closes `UserMenu`.
- Responsive checks on:
  - `/dashboard/[groupId]`
  - `/profile`
  - `/admin`
  - `/platform`
