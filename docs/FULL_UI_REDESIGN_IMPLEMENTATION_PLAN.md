# Full UI Redesign Implementation Plan (VecinoHub)

## Scope
- Implement the **entire VecinoHub UI redesign** using `/Users/angel/Downloads/vecinohub-redesign` as the visual source of truth.
- Keep feature behavior and permissions working while matching the new UI very closely.
- Cover all user-facing routes and all admin routes in `src/app`.

## Source Design Reference
- Root: `/Users/angel/Downloads/vecinohub-redesign`
- Key source pages:
  - `src/pages/AuthPage.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/ProfilePage.tsx`
  - `src/pages/GroupMembersPage.tsx`
  - `src/pages/EventsListPage.tsx`
  - `src/pages/EventDetailPage.tsx`
  - `src/pages/PostsListPage.tsx`
  - `src/pages/PostDetailPage.tsx`
  - `src/pages/PollsListPage.tsx`
  - `src/pages/PollDetailPage.tsx`
  - `src/pages/FundraisingListPage.tsx`
  - `src/pages/CampaignDetailPage.tsx`
  - `src/pages/ContributionPage.tsx`
  - `src/pages/AdminPage.tsx`
  - `src/pages/admin/*`
- Key shared source components:
  - `src/components/dashboard/*`
  - `src/components/content/*`
  - `src/components/auth/*`
  - `src/components/admin/*`
  - `src/components/profile/*`
  - `src/components/members/*`
  - `src/index.css`

## Non-Negotiable Architecture Rules
- SSR-first for read pages.
- Mutations only through tRPC.
- Services own validation/business logic/DB access.
- Keep server-side permission checks intact.
- Keep i18n via `next-intl`; do not ship hardcoded UI copy.
- Keep/restore testability (`data-testid`) for critical flows.

## Fit-Gap Decisions (must be resolved before major coding)
The redesign contains some states/features not fully represented in current backend contracts. Resolve these first:

1. Auth redesign includes:
- Single combined sign-in/sign-up page
- Social login buttons (Google/Facebook UI)
- OTP email verification for sign-up
- OTP reset-password flow

Current backend:
- Email+password enabled
- Google social provider supported through `src/server/better-auth.ts` env config
- Facebook login remains UI-only (disabled in auth flow)
- No completed OTP verification + reset-password UX integration in app routes

Decision required:
- `A)` Implement full backend support now (social + OTP + reset flow), or
- `B)` Ship UI shells with disabled/hidden unsupported actions behind feature flags.
Decision taken:
- `B)` Phased rollout:
  - Social OAuth is enabled for Google when provider credentials are configured.
  - Facebook social button remains non-OAuth in this phase.
  - OTP/reset remains UI messaging only, controlled by `NEXT_PUBLIC_AUTH_OTP_ENABLED`.

2. Admin redesign status models exceed current DB enums:
- Campaign redesign: `open | paused | ended` vs current DB `open | closed`
- Post redesign: includes `unpublished` vs current DB `draft | published`
- User redesign: includes `suspended | pending` vs current DB `active | inactive`
- Event redesign includes richer statuses in UI, while domain is primarily date-driven

Decision required:
- `A)` Expand schema + services + permissions (migration work), or
- `B)` Map redesign states to existing domain states for V1 parity.
Decision taken:
- `B)` UI maps redesign states to existing domain enums/contracts (`open|closed`, `draft|published`, `active|inactive`) for V1 parity.

## Execution Notes
- Source lock: `/Users/angel/Downloads/vecinohub-redesign` snapshot used for implementation baseline on 2026-02-28.
- Route mapping and visual contracts were applied to all routes listed in the checklist below.
- Dashboard v2 foundation from the prior dashboard redesign plan was reused and extended across auth/profile/admin/resident modules.

## Implementation Strategy
- Do not embed the Vite app directly.
- Port design markup/classes into Next.js route/component structure.
- Keep route boundaries and SSR data loading from existing app.
- Build reusable `v3` UI primitives once, then apply across all modules.

---

## Phased Execution Plan

## Phase 0: Alignment and Baseline
- [x] Lock redesign source version (commit hash or zipped snapshot path).
- [x] Produce route-by-route mapping sheet (source file -> Next route).
- [x] Capture current UI screenshots for all routes (desktop/tablet/mobile).
- [x] Capture redesign reference screenshots for matching states.
- [x] Finalize Fit-Gap decisions above and document selected approach.
- [x] Define “visual parity tolerance” (strict class-level match where feasible).

## Phase 1: Global UI Foundation
- [x] Introduce scoped redesign style tokens/utilities in `src/app/globals.css`.
- [x] Add shared typography/focus/scrollbar/skeleton utilities used in redesign.
- [x] Create reusable shared primitives in new folder (recommended): `src/components/ui-v3/`
- [x] Implement shared components from redesign:
  - Search input
  - Pagination
  - Status chip/badge variants
  - Confirm dialog
  - Empty state + loading skeleton patterns
- [x] Add route-safe class naming to avoid style bleed into legacy surfaces during migration.

## Phase 2: Auth Redesign
- [x] Redesign `/login` with combined tabbed sign-in/sign-up UI matching `AuthPage.tsx`.
- [x] Keep `/register` route behavior:
  - Option 1: redirect to `/login?tab=signup`
  - Option 2: render same combined auth component with signup tab active
- [x] Implement social button UI behavior per Fit-Gap decision.
- [x] Implement OTP verification/reset UI flow per Fit-Gap decision.
- [x] Preserve auth errors, loading states, and existing redirect to `/dashboard`.
- [x] Add i18n keys for all new auth copy in EN/ES.

## Phase 3: Resident Dashboard and Shared Header
- [x] Keep current `/dashboard` logic (redirects + no-group state) and align visuals to redesign.
- [x] Keep `/dashboard/[groupId]/layout.tsx` SSR membership checks and migrate fully to redesign header behavior.
- [x] Ensure dropdown/menu interactions match redesign (focus, keyboard, sticky header).
- [x] Align overview cards and spacing with source `Dashboard.tsx` and `components/dashboard/*`.
- [x] Preserve links to profile, members, events, posts, polls, fundraising.

## Phase 4: Resident Detail/List Modules

### Members
- [x] Redesign `/dashboard/[groupId]/members` to match `GroupMembersPage.tsx` closely.
- [x] Keep add/remove member mutations via tRPC and permission checks.
- [x] Implement manager/viewer states, empty states, and toast patterns.

### Events
- [x] Redesign `/dashboard/[groupId]/events` from `EventsListPage.tsx`.
- [x] Redesign `/dashboard/[groupId]/events/[eventId]` from `EventDetailPage.tsx`.
- [x] Preserve SSR reads and admin action links.

### Posts
- [x] Redesign `/dashboard/[groupId]/posts` from `PostsListPage.tsx`.
- [x] Redesign `/dashboard/[groupId]/posts/[postId]` from `PostDetailPage.tsx`.
- [x] Preserve publish visibility rules from current domain.

### Polls
- [x] Redesign `/dashboard/[groupId]/polls` from `PollsListPage.tsx`.
- [x] Redesign `/dashboard/[groupId]/polls/[pollId]` from `PollDetailPage.tsx`.
- [x] Preserve one-vote-per-group rules and mutation paths.
- [x] Keep status-specific UX (active/draft/closed) and vote feedback banners.

### Fundraising
- [x] Redesign `/dashboard/[groupId]/fundraising` from `FundraisingListPage.tsx`.
- [x] Redesign `/dashboard/[groupId]/fundraising/[campaignId]` from `CampaignDetailPage.tsx`.
- [x] Redesign `/dashboard/[groupId]/fundraising/[campaignId]/contribute` from `ContributionPage.tsx`.
- [x] Preserve contribution validation and admin review flow constraints.

### Profile
- [x] Redesign `/profile` from `ProfilePage.tsx` + profile components.
- [x] Preserve username/image/language update behavior and locale cookie updates.

## Phase 5: Admin Shell and Overview
- [x] Redesign `(admin)` layout shell to match `AdminShell.tsx`.
- [x] Preserve admin guard behavior and route access control.
- [x] Implement redesign breadcrumbs/topbar/sidebar interaction.
- [x] Redesign `/admin` overview using `AdminOverview.tsx` visual/interaction contract.

## Phase 6: Admin Modules (full route coverage)

### Users
- [x] Redesign `/admin/users` (search/filter/status/role/actions) from `AdminUsers.tsx`.
- [x] Keep existing role/status mutation contracts.

### Groups
- [x] Redesign `/admin/groups` list + detail visual patterns from `AdminGroups.tsx`.
- [x] Redesign `/admin/groups/new` and `/admin/groups/[groupId]/edit` from `AdminGroupForm.tsx`.
- [x] Redesign `/admin/groups/[groupId]` detail actions/stats/members composition.

### Polls
- [x] Redesign `/admin/polls` list/detail/actions from `AdminPolls.tsx`.
- [x] Redesign `/admin/polls/new` and `/admin/polls/[pollId]/edit` from `AdminPollForm.tsx`.
- [x] Redesign `/admin/polls/[pollId]` detail sections/options/lifecycle controls.

### Fundraising
- [x] Redesign `/admin/fundraising` list/detail/actions from `AdminFundraising.tsx`.
- [x] Redesign `/admin/fundraising/new` and `/admin/fundraising/[campaignId]/edit` from `AdminCampaignForm.tsx`.
- [x] Redesign `/admin/fundraising/[campaignId]` detail with contribution review states.
- [x] Redesign `/admin/fundraising/[campaignId]/contribute` with same new visual language.

### Events
- [x] Redesign `/admin/events` list/detail/actions from `AdminEvents.tsx`.
- [x] Redesign `/admin/events/new` and `/admin/events/[eventId]/edit` from `AdminEventForm.tsx`.
- [x] Redesign `/admin/events/[eventId]` detail actions and metadata display.

### Posts
- [x] Redesign `/admin/posts` list/detail/actions from `AdminPosts.tsx`.
- [x] Redesign `/admin/posts/new` and `/admin/posts/[postId]/edit` from `AdminPostForm.tsx`.
- [x] Redesign `/admin/posts/[postId]` detail moderation/action panel.

## Phase 7: Fidelity + Accessibility + Regression Pass
- [x] Route-by-route visual compare against redesign references.
- [x] Verify spacing/radius/border/shadow/typography parity.
- [x] Keyboard navigation + focus-visible checks.
- [x] ARIA labels/roles for dialogs, status banners, pagination, action menus.
- [x] Responsive checks at mobile/tablet/desktop breakpoints.
- [x] Dark legacy style artifacts removed from redesigned routes.

## Phase 8: QA + Documentation + Release Readiness
- [x] Update `docs/SCREENS.md` for full redesigned UI map.
- [x] Update `docs/QA.md` with new route checks and states.
- [x] Update `docs/PLAYWRIGHT_TEST_RUNS.md` if selectors/flows changed.
- [x] Add new Playwright evidence screenshots for full redesigned route matrix.
- [x] Run `npm run lint` and fix all introduced issues.
- [x] Perform final permission regression pass (admin vs user behavior).

---

## Full Route Coverage Checklist

### Core and Auth
- [x] `/`
- [x] `/login`
- [x] `/register`
- [x] `/profile`

### Dashboard and Member Area
- [x] `/dashboard`
- [x] `/dashboard/[groupId]`
- [x] `/dashboard/[groupId]/members`
- [x] `/dashboard/[groupId]/events`
- [x] `/dashboard/[groupId]/events/[eventId]`
- [x] `/dashboard/[groupId]/posts`
- [x] `/dashboard/[groupId]/posts/[postId]`
- [x] `/dashboard/[groupId]/polls`
- [x] `/dashboard/[groupId]/polls/[pollId]`
- [x] `/dashboard/[groupId]/fundraising`
- [x] `/dashboard/[groupId]/fundraising/[campaignId]`
- [x] `/dashboard/[groupId]/fundraising/[campaignId]/contribute`

### Admin
- [x] `/admin`
- [x] `/admin/users`
- [x] `/admin/groups`
- [x] `/admin/groups/new`
- [x] `/admin/groups/[groupId]`
- [x] `/admin/groups/[groupId]/edit`
- [x] `/admin/polls`
- [x] `/admin/polls/new`
- [x] `/admin/polls/[pollId]`
- [x] `/admin/polls/[pollId]/edit`
- [x] `/admin/fundraising`
- [x] `/admin/fundraising/new`
- [x] `/admin/fundraising/[campaignId]`
- [x] `/admin/fundraising/[campaignId]/edit`
- [x] `/admin/fundraising/[campaignId]/contribute`
- [x] `/admin/events`
- [x] `/admin/events/new`
- [x] `/admin/events/[eventId]`
- [x] `/admin/events/[eventId]/edit`
- [x] `/admin/posts`
- [x] `/admin/posts/new`
- [x] `/admin/posts/[postId]`
- [x] `/admin/posts/[postId]/edit`

---

## Recommended PR Slicing (for control and review quality)
1. Foundation + shared primitives (`ui-v3`, globals, tokens).
2. Auth redesign.
3. Dashboard shell + overview stabilization.
4. Members + Profile.
5. Events list/detail + admin events.
6. Posts list/detail + admin posts.
7. Polls list/detail + admin polls.
8. Fundraising list/detail/contribute + admin fundraising.
9. Admin shell + users/groups/overview consolidation.
10. Full-app QA/docs/update sweep.

## Definition of Done
- Every route listed in “Full Route Coverage Checklist” is redesigned and verified.
- Visual parity to redesign is high (layout, typography, spacing, controls, states).
- No architecture rule regressions (SSR reads, tRPC mutations, services-only DB access).
- Permissions and role gating remain correct.
- QA/docs are updated for the new full UI baseline.
