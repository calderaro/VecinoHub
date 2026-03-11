# Screens and UI Map

## Public
- `/`
  - Signed-out users: landing page.
  - Signed-in users: redirect to `/dashboard`.
- `/login`
  - combined auth screen for sign-in and sign-up.
  - sign-up requires email OTP confirmation before session creation.
- `/forgot-password`
  - dedicated two-step password reset flow.
  - first step requests OTP by email.
  - second step collects OTP, new password, and password confirmation.
- `/register` -> redirects to `/login?tab=signup`

## Resident Dashboard
- `/dashboard`
  - redirects to first available group in active neighborhood context.
  - no-group users see waiting state.
- `/dashboard/[groupId]`
  - overview cards: posts, events, polls, fundraising, members.
  - sticky header with `UserMenu`.
  - `UserMenu` supports:
    - profile link
    - group switcher
    - neighborhood switcher (if user has >1 neighborhood)
    - admin/platform entries based on role
- Resident modules:
- `/dashboard/[groupId]/members`
  - read-only for `group_member`.
  - `group_admin`, `neighborhood_admin`, and `platform_admin` can add/remove members and change group roles.
- `/dashboard/[groupId]/polls`
  - `/dashboard/[groupId]/polls/[pollId]`
  - `/dashboard/[groupId]/fundraising`
  - `/dashboard/[groupId]/fundraising/[campaignId]`
    - shows campaign summary plus only the signed-in resident's own submissions for the selected group.
  - `/dashboard/[groupId]/fundraising/[campaignId]/contribute`
  - `/dashboard/[groupId]/events`
  - `/dashboard/[groupId]/events/[eventId]`
  - `/dashboard/[groupId]/posts`
  - `/dashboard/[groupId]/posts/[postId]`

## Profile
- `/profile`
  - profile form (full name, username, language).
  - includes `UserMenu` with group + neighborhood switching.

## Neighborhood Admin Shell
- `/admin/*`
  - access requires neighborhood admin membership or platform admin.
- Routes:
  - `/admin`
  - `/admin/[neighborhoodId]`
  - `/admin/[neighborhoodId]/groups`, `/admin/[neighborhoodId]/groups/new`, `/admin/[neighborhoodId]/groups/[groupId]`, `/admin/[neighborhoodId]/groups/[groupId]/edit`
  - `/admin/[neighborhoodId]/polls`, `/admin/[neighborhoodId]/polls/new`, `/admin/[neighborhoodId]/polls/[pollId]`, `/admin/[neighborhoodId]/polls/[pollId]/edit`
  - `/admin/[neighborhoodId]/fundraising`, `/admin/[neighborhoodId]/fundraising/new`, `/admin/[neighborhoodId]/fundraising/[campaignId]`, `/admin/[neighborhoodId]/fundraising/[campaignId]/edit`, `/admin/[neighborhoodId]/fundraising/[campaignId]/contribute`
  - `/admin/[neighborhoodId]/events`, `/admin/[neighborhoodId]/events/new`, `/admin/[neighborhoodId]/events/[eventId]`, `/admin/[neighborhoodId]/events/[eventId]/edit`
  - `/admin/[neighborhoodId]/posts`, `/admin/[neighborhoodId]/posts/new`, `/admin/[neighborhoodId]/posts/[postId]`, `/admin/[neighborhoodId]/posts/[postId]/edit`
  - `/admin/[neighborhoodId]/users`
    - neighborhood-scoped list of users who hold at least one active group membership in that neighborhood.
    - neighborhood admins and platform admins can open the list and the user detail screen.
  - `/admin/[neighborhoodId]/users/[userId]`
    - read-only neighborhood-scoped user detail.
    - shows only the user's group memberships in the current neighborhood.
  - `/admin/[neighborhoodId]/members`
    - neighborhood role management for neighbors and neighborhood admins.
    - only users with a neighborhood membership appear in the list.
    - assigning a neighborhood role is done through a dialog that asks for an existing user email plus the target role.

## Platform Admin Shell
- `/platform`
  - access requires `platform_admin` (or legacy `admin` compatibility).
  - platform neighborhood management dashboard.
  - includes neighborhood creation form and neighborhood list.
- `/platform/users`
  - global platform user directory.
  - shows every user account with search, role filter, status filter, pagination, and links to detail.
- `/platform/users/[userId]`
  - platform user detail and management screen.
  - shows platform role/status controls plus neighborhood and group memberships across the full system.
- `/platform/[neighborhoodId]`
  - platform neighborhood detail screen.
  - shows neighborhood metadata, editable neighborhood member list, add-user form, edit entry, and delete confirmation flow.
- `/platform/[neighborhoodId]/edit`
  - platform neighborhood edit screen.
  - updates name, slug, and status.

## Rendering Contract
- SSR-first reads from services.
- All writes through tRPC mutations.
- Service layer owns validation, permissions, and tenant scoping.
