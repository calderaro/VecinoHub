# Screens and UI Map

## Global Visual Baseline
- Design source: `/Users/angel/Downloads/vecinohub-redesign`
- App-wide style direction: `stone` light surfaces, `teal` primary actions, rounded `xl` cards, low-elevation shadows.
- Shared utilities live in:
  - `src/app/globals.css` (`vh-v3-*`, `dashboard-v2-*`)
  - `src/components/ui-v3/*`

## Auth
- Route `/login`
  - Combined tabbed sign-in/sign-up shell.
  - Social and OTP/reset actions are UI-visible but disabled when feature flags are off.
  - CSR-only form logic (Better Auth client + tRPC profile language update on signup).
- Route `/register`
  - Redirects to `/login?tab=signup`.

## Dashboard (Resident)
- Route `/dashboard`
  - Unauthenticated users redirect to `/login`.
  - Users without groups see waiting/no-group state.
  - Users with groups redirect to `/dashboard/{firstGroupId}`.
- Route `/dashboard/[groupId]`
  - Sticky 56px header with user menu actions.
  - Overview cards: posts, events, polls, fundraising, members.

## Resident Modules
- `/dashboard/[groupId]/members`
  - Group roster with add/remove member dialogs (permission-gated).
- `/dashboard/[groupId]/events`
- `/dashboard/[groupId]/events/[eventId]`
- `/dashboard/[groupId]/posts`
- `/dashboard/[groupId]/posts/[postId]`
- `/dashboard/[groupId]/polls`
- `/dashboard/[groupId]/polls/[pollId]`
- `/dashboard/[groupId]/fundraising`
- `/dashboard/[groupId]/fundraising/[campaignId]`
- `/dashboard/[groupId]/fundraising/[campaignId]/contribute`

## Profile
- Route `/profile`
  - Sticky header + account intro.
  - Editable profile card (username, image URL, language).

## Admin Shell
- All `/admin/*` routes share:
  - Left sidebar (desktop), topbar with user menu, mobile horizontal nav chips.
  - Server-side admin guard remains enforced in layout.

## Admin Routes
- `/admin` (overview)
- `/admin/users`
- `/admin/users/[userId]`
- `/admin/users/[userId]/edit`
- `/admin/groups`
- `/admin/groups/new`
- `/admin/groups/[groupId]`
- `/admin/groups/[groupId]/edit`
- `/admin/polls`
- `/admin/polls/new`
- `/admin/polls/[pollId]`
- `/admin/polls/[pollId]/edit`
- `/admin/fundraising`
- `/admin/fundraising/new`
- `/admin/fundraising/[campaignId]`
- `/admin/fundraising/[campaignId]/edit`
- `/admin/fundraising/[campaignId]/contribute`
- `/admin/events`
- `/admin/events/new`
- `/admin/events/[eventId]`
- `/admin/events/[eventId]/edit`
- `/admin/posts`
- `/admin/posts/new`
- `/admin/posts/[postId]`
- `/admin/posts/[postId]/edit`

## Rendering Contract
- SSR-first reads from services on all list/detail pages.
- Mutations stay in client components through tRPC mutation hooks.
- Permission checks remain server-side in services/layouts/pages.
