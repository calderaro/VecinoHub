# QA Checklist (Redesign Baseline)

## Public Landing
- `/` shows marketing landing for signed-out users.
- `/` redirects authenticated users to `/dashboard`.
- Landing primary CTA routes to `/login`.
- Landing includes visible legal links to `/en/terms-of-service`, `/en/privacy-policy`, and `/en/data-deletion`.

## Auth
- `/login` renders combined tabbed sign-in/sign-up UI.
- Sign in succeeds and redirects to `/dashboard`.
- Sign up succeeds and redirects to `/dashboard`.
- `/register` redirects to `/login?tab=signup`.
- Clicking `auth-social-google` starts OAuth redirect flow.
- Clicking `auth-social-facebook` starts OAuth redirect flow.
- Forgot password messaging still shows OTP/reset not enabled notice.

## Dashboard
- `/dashboard` unauthenticated redirect works.
- `/dashboard` no-group waiting state renders correctly.
- `/dashboard/[groupId]` overview renders all 5 cards and keeps sticky header.
- User menu supports keyboard and escape-close behavior.

## Resident Modules
- Members: add/remove works only for allowed users; non-managers can still view list.
- Events: list search/filter and detail page render expected data.
- Posts: list and detail render expected publish visibility.
- Polls: list + detail render; vote form respects status and one-vote-per-group rule.
- Fundraising: list + detail + contribution form validations work.

## Profile
- Username validation and image URL validation work.
- Preferred language save updates cookie and locale behavior.

## Legal
- `/en/terms-of-service` renders with legal nav links.
- `/en/privacy-policy` renders and is reachable from legal nav.
- `/en/data-deletion` renders and is reachable from legal nav.

## Admin Shell + Modules
- Non-admin cannot access `/admin/*`.
- Sidebar/topbar shell renders on all admin routes.
- Users list/detail/edit access management works from `/admin/users`.
- Groups create/edit/detail flows work.
- Polls create/edit/options/actions flows work.
- Fundraising create/edit/detail/contribution-review flows work.
- Events create/edit/detail/delete flows work.
- Posts create/edit/publish/unpublish/delete flows work.

## Visual + Accessibility
- Stone light surfaces and teal accents are consistent across auth/dashboard/profile/admin.
- Focus-visible ring appears on interactive controls.
- Dialog overlays close on escape (where applicable) and preserve action states.
- Responsive checks at mobile/tablet/desktop for key routes:
  - `/login`
  - `/dashboard/[groupId]`
  - `/dashboard/[groupId]/members`
  - `/admin`
  - `/admin/users`

## Regression
- `npm run lint` passes.
- `npm run build` passes.
- Core permission boundaries remain unchanged:
  - admin-only admin routes
  - group membership checks for dashboard group routes
  - service-layer authorization for mutations
