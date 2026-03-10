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
  - `/dashboard/[groupId]/polls`
  - `/dashboard/[groupId]/polls/[pollId]`
  - `/dashboard/[groupId]/fundraising`
  - `/dashboard/[groupId]/fundraising/[campaignId]`
  - `/dashboard/[groupId]/fundraising/[campaignId]/contribute`
  - `/dashboard/[groupId]/events`
  - `/dashboard/[groupId]/events/[eventId]`
  - `/dashboard/[groupId]/posts`
  - `/dashboard/[groupId]/posts/[postId]`

## Profile
- `/profile`
  - profile form (username/image/language).
  - includes `UserMenu` with group + neighborhood switching.

## Neighborhood Admin Shell
- `/admin/*`
  - access requires neighborhood admin membership or platform admin.
  - users module remains platform-admin only.
- Routes:
  - `/admin`
  - `/admin/groups`, `/admin/groups/new`, `/admin/groups/[groupId]`, `/admin/groups/[groupId]/edit`
  - `/admin/polls`, `/admin/polls/new`, `/admin/polls/[pollId]`, `/admin/polls/[pollId]/edit`
  - `/admin/fundraising`, `/admin/fundraising/new`, `/admin/fundraising/[campaignId]`, `/admin/fundraising/[campaignId]/edit`, `/admin/fundraising/[campaignId]/contribute`
  - `/admin/events`, `/admin/events/new`, `/admin/events/[eventId]`, `/admin/events/[eventId]/edit`
  - `/admin/posts`, `/admin/posts/new`, `/admin/posts/[postId]`, `/admin/posts/[postId]/edit`
  - `/admin/users`, `/admin/users/[userId]`, `/admin/users/[userId]/edit` (platform admin only)

## Platform Admin Shell
- `/platform`
  - access requires `platform_admin` (or legacy `admin` compatibility).
  - platform neighborhood management dashboard.
  - includes neighborhood creation form and neighborhood list.
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
