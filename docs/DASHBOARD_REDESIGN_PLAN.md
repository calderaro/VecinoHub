# Dashboard Redesign Plan (MagicPatterns Baseline)

## Scope
- Rebuild `/dashboard` and `/dashboard/[groupId]` to match the new MagicPatterns design very closely.
- Keep current VecinoHub architecture constraints:
  - SSR-first for reads
  - service-layer data access
  - tRPC for mutations
  - server-side permission checks
- Treat this dashboard redesign as the visual foundation for a future full-app redesign.

## Source Design Reference
- Design app path: `/Users/angel/Downloads/vecinohub-magicpatterns-design`
- Primary references:
  - `src/pages/Dashboard.tsx`
  - `src/components/dashboard/*`
  - `src/index.css`

## Target Files in VecinoHub
- `/Users/angel/dev/angel/imperio/VecinoHub/src/app/dashboard/page.tsx`
- `/Users/angel/dev/angel/imperio/VecinoHub/src/app/dashboard/[groupId]/layout.tsx`
- `/Users/angel/dev/angel/imperio/VecinoHub/src/app/dashboard/[groupId]/page.tsx`
- `/Users/angel/dev/angel/imperio/VecinoHub/src/components/user-menu.tsx`
- `/Users/angel/dev/angel/imperio/VecinoHub/src/app/globals.css`
- New: `/Users/angel/dev/angel/imperio/VecinoHub/src/components/dashboard-v2/*`

## Visual Contract to Match
- Canvas/background:
  - App background `stone-50`
  - White cards with light gray borders
- Header:
  - Sticky top, `h-14` (56px)
  - `border-stone-200`, white background
  - Container `max-w-7xl`, `px-4 sm:px-6`
- Main layout:
  - Container `max-w-7xl`
  - `px-4 sm:px-6`, `py-8 sm:py-10`
  - Intro margin bottom `mb-8`
- Overview grid:
  - `grid-cols-1 lg:grid-cols-2`
  - `gap-5`
  - Members card spans `lg:col-span-2`
- Card shell:
  - `rounded-xl`
  - `border-stone-200`
  - `shadow-sm`
  - `overflow-hidden`
- Card header:
  - `px-5 py-4`
  - divider `border-stone-100`
- Card rows:
  - `px-5 py-3`
  - row hover `bg-stone-50`
  - row divider `divide-stone-100`
- Empty states:
  - centered stack
  - icon `w-8 h-8`
  - body area `py-10`
- Chips:
  - active: teal family
  - draft/user: stone family
  - closed: red family
  - admin: violet family
- Typography:
  - Inter look and scale from source design
  - Preserve existing i18n behavior (EN/ES)
- Interaction polish:
  - focus-visible ring (teal)
  - subtle custom scrollbar
  - skeleton shimmer class for loading placeholders

## Functional Contract to Preserve
- `/dashboard`:
  - unauthenticated -> `/login`
  - no groups -> show no-group state
  - has groups -> redirect to `/dashboard/{firstGroupId}`
- `/dashboard/[groupId]` layout:
  - validate membership
  - invalid group id -> redirect to first accessible group
- Header menu actions:
  - Dashboard
  - Profile
  - Admin Panel (admin only)
  - Switch Group
  - Sign out
- Overview sections and links:
  - Latest Posts
  - Upcoming Events
  - Active Polls
  - Fundraising Campaigns
  - Group Members
- Keep existing testability:
  - preserve current `data-testid` values where possible
  - if changed, update QA and Playwright docs/tests in same implementation cycle

## Implementation Phases

### Phase 0: Baseline and Acceptance Criteria
- Capture current screenshots for:
  - `/dashboard` no-group
  - `/dashboard/{groupId}` overview
  - open user menu states
- Capture matching screenshots from MagicPatterns app for side-by-side comparison.
- Finalize measurable visual checks:
  - header height
  - border/radius/shadow values
  - spacing scale
  - text size/weight per section

### Phase 1: Dashboard-v2 Styling Foundation
- Add scoped style layer for dashboard-v2 in `globals.css` (avoid global theme collisions).
- Add Inter font for dashboard-v2 scope only.
- Add reusable utility classes:
  - focus ring
  - skeleton shimmer
  - light scrollbar
- Keep existing dark theme tokens unchanged for non-dashboard surfaces.

### Phase 2: Build Dashboard-v2 Reusable Components
- Create `src/components/dashboard-v2/`:
  - `DashboardHeader.tsx`
  - `DashboardIntro.tsx`
  - `SectionCard.tsx`
  - `StatusChip.tsx`
  - `NoGroupState.tsx`
  - `SkeletonCard.tsx`
  - `PostsCard.tsx`
  - `EventsCard.tsx`
  - `PollsCard.tsx`
  - `FundraisingCard.tsx`
  - `MembersCard.tsx`
- Mirror MagicPatterns structure/classes closely for parity.
- Build components to accept real domain props, not mock data shapes.

### Phase 3: Integrate Header and No-Group State
- Replace no-group UI in `/dashboard/page.tsx` with `NoGroupState` visual design.
- Replace `/dashboard/[groupId]/layout.tsx` header block with `DashboardHeader`.
- Keep existing auth/group guard logic intact.
- Wire actions to existing routes and auth behavior.

### Phase 4: Integrate Overview Page
- Replace section markup in `/dashboard/[groupId]/page.tsx` with v2 cards and grid.
- Keep existing service calls and SSR data loading.
- Add mapper helpers for:
  - post snippet
  - event date formatting
  - campaign amount formatting
  - avatar fallback initial/color
- Keep all section destination links unchanged.

### Phase 5: i18n and Copy Alignment
- Move any hardcoded v2 copy to message files.
- Update:
  - `/Users/angel/dev/angel/imperio/VecinoHub/src/messages/en.json`
  - `/Users/angel/dev/angel/imperio/VecinoHub/src/messages/es.json`
- Ensure no translation key regressions on `/dashboard`.

### Phase 6: QA and Precision Pass
- Visual parity pass against MagicPatterns reference.
- Keyboard and accessibility pass:
  - menu open/close
  - escape behavior
  - focus visibility
- Validate responsive behavior:
  - mobile
  - tablet
  - desktop
- Validate no regressions:
  - redirects
  - permissions
  - group switching
  - sign out

### Phase 7: Rollout Readiness for Full-App Redesign
- Extract reusable design primitives from dashboard-v2 for later surfaces.
- Create follow-up migration plan for:
  - dashboard subpages
  - profile
  - admin surfaces

## Risks and Mitigations
- Font mismatch (Onest vs Inter):
  - Mitigation: scope Inter to dashboard-v2.
- Global style bleed:
  - Mitigation: namespace v2 styles to dashboard route wrappers.
- Test breakage due to structural updates:
  - Mitigation: preserve or alias current test IDs and update docs/tests.
- i18n drift from source design hardcoded strings:
  - Mitigation: all user-facing copy must go through `next-intl`.

## Definition of Done
- `/dashboard` and `/dashboard/[groupId]` match MagicPatterns design style closely in spacing, sizing, color, and hierarchy.
- Existing dashboard behavior and permissions remain correct.
- SSR/service architecture unchanged.
- QA/playwright contracts remain valid and docs are updated when selectors/flows change.

---

## Execution Checklist

### Preparation
- [x] Create branch: `codex/dashboard-v2-redesign`.
- [x] Capture before screenshots for current dashboard routes/states.
- [x] Capture reference screenshots from MagicPatterns app.
- [x] Confirm acceptance tolerance (strict visual match).

### Styling Foundation
- [x] Add dashboard-v2 scoped style block in `globals.css`.
- [x] Add Inter font for dashboard-v2 scope.
- [x] Add focus-visible ring utility.
- [x] Add skeleton shimmer utility.
- [x] Add light scrollbar utility.

### Component Buildout
- [x] Create `src/components/dashboard-v2/SectionCard.tsx`.
- [x] Create `src/components/dashboard-v2/StatusChip.tsx`.
- [x] Create `src/components/dashboard-v2/DashboardHeader.tsx`.
- [x] Create `src/components/dashboard-v2/DashboardIntro.tsx`.
- [x] Create `src/components/dashboard-v2/SkeletonCard.tsx`.
- [x] Create `src/components/dashboard-v2/NoGroupState.tsx`.
- [x] Create `src/components/dashboard-v2/PostsCard.tsx`.
- [x] Create `src/components/dashboard-v2/EventsCard.tsx`.
- [x] Create `src/components/dashboard-v2/PollsCard.tsx`.
- [x] Create `src/components/dashboard-v2/FundraisingCard.tsx`.
- [x] Create `src/components/dashboard-v2/MembersCard.tsx`.

### Route Integration
- [x] Update `/src/app/dashboard/page.tsx` no-group state to v2 component.
- [x] Update `/src/app/dashboard/[groupId]/layout.tsx` header to v2 component.
- [x] Update `/src/app/dashboard/[groupId]/page.tsx` overview to v2 cards/grid.
- [x] Add/adjust mapper helpers for data shape transformation.
- [x] Keep route guards and redirects unchanged.

### i18n and Test IDs
- [x] Add any missing dashboard-v2 copy keys in `messages/en.json`.
- [x] Add matching copy keys in `messages/es.json`.
- [x] Preserve existing dashboard test IDs where possible.
- [x] Add compatibility test IDs where structure changed.

### Verification
- [x] Run lint: `npm run lint`.
- [x] Manual test: unauthenticated redirect from `/dashboard`.
- [x] Manual test: no-group state renders correctly.
- [x] Manual test: valid group overview renders with all 5 sections.
- [x] Manual test: user menu actions (dashboard/profile/admin/group/sign out).
- [x] Manual test: section links navigate correctly.
- [x] Manual test: mobile/tablet/desktop spacing parity.
- [x] Visual compare against MagicPatterns screenshots.

### Documentation
- [x] Update `docs/SCREENS.md` for redesigned dashboard visuals.
- [x] Update `docs/QA.md` with new dashboard checks if needed.
- [x] Update `docs/PLAYWRIGHT_TEST_RUNS.md` if selectors/flows changed.
- [x] Add implementation notes (decisions + deltas) to PR description.

Implementation notes (decisions + deltas):
- Added `src/components/dashboard-v2/*` primitives and card components to mirror MagicPatterns spacing/card/menu structure while preserving SSR service calls and route guards.
- Kept existing overview and user-menu `data-testid` anchors; added compatibility IDs for no-group state (`dashboard-no-group-state`, `dashboard-no-group-status`) and row links on overview cards.
- Consolidated duplicate top-level `dashboard` keys in `messages/en.json` and `messages/es.json` to prevent i18n key override issues.
- Section “View all” actions remain visible even in empty states to preserve destination-link behavior from the prior dashboard contract.
- Verification artifacts are stored in `output/playwright/dashboard-v2/` including responsive captures and reference baseline screenshot from MagicPatterns.
