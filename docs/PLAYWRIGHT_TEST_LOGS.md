# Playwright Test Logs

## 2026-07-12 12:47 CST - Open PR stack automated QA - local
### Scope
- Corrected PR stack for #21, #22, and #23 on `angel/pr23-review-fixes`.
- Access-request privacy and approval flows, dashboard/admin smoke coverage, and PostgreSQL concurrency invariants.

### Environment
- Node.js 22.22.0.
- Chromium 145 via Playwright.
- Disposable PostgreSQL database `vecinohub_qa_prs` created from the current Drizzle schema.
- Seeded local-only QA accounts and data.

### Results
- PASS: 82 unit tests, ESLint, TypeScript, and production build.
- PASS: 7 smoke browser tests.
- PASS: shared access-request link hides group street addresses.
- PASS: resident request creation and manager approval flow.
- PASS: neighborhood access-request screen and approval flow.
- PASS: real PostgreSQL confirm-vs-waive serialization.
- PASS: real PostgreSQL contribution confirm-vs-owner-delete invariant.
- PASS: real PostgreSQL reservation concurrency limit.
- PASS: real PostgreSQL deactivation-vs-approval serialization.

### QA Infrastructure Repairs
- Playwright now uses `localhost` by default so Next.js hydration assets share the app origin.
- Seed credentials come from the shared Playwright fixture instead of a hard-coded password.
- Access-request selectors and expectations match the current dialog, tabs, and address-free group labels.
- Smoke navigation selects the authorized neighborhood deterministically and follows current routes.

### Issues
- Fresh `npm run db:migrate` fails in the historical migration chain because an older backfill migration raises `Cannot create default neighborhood without users` on an empty database. This run used `drizzle-kit push --force` only for the disposable QA database.
- Better Auth warns that the `next-cookies` integration plugin is not last in the plugin list.
- The broad E2E inventory still contains many `test.fixme` placeholders; only implemented tests provide executable coverage.

### Artifacts
- Failure traces and screenshots from the red/green repair loop remain under `test-results/` locally.
- Repeatable PostgreSQL checks: `npm run qa:open-prs`.

### Data Modified
- Disposable local database only.

### Cleanup Completed
- Dropped `vecinohub_qa_prs` and stopped the pre-existing local PostgreSQL container after validation.

## 2026-02-28 19:05 CST - Codex (Playwright MCP) - local
### Scope
- Admin overview parity pass for `/admin`.

### Preconditions
- VecinoHub running at `http://localhost:3000`.
- Reference app running at `http://127.0.0.1:4173`.
- Admin session available.

### Accounts Used
- VecinoHub admin session (existing browser context).
- Reference app admin account (`admin@example.com`).

### Steps Executed
- Updated overview page layout/copy handling and topbar breadcrumb behavior.
- Re-ran screenshot capture script and image diff script for admin sections.
- Opened `/admin` and validated overview cards, panel links, and quick-create action.

### Results
- PASS: `/admin` now matches topbar breadcrumb behavior (`Overview` only on overview route).
- PASS: Overview KPI labels, panel copy, and list/status rows align with the target UI structure.
- PASS: Visual diff improved for overview from `3.17%` to `2.84%` mismatch.

### Issues
- Remaining mismatch is mostly locale/data-content variance compared to static reference fixtures.

### Artifacts
- `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1/redesign-overview.png`
- `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1/vecino-overview.png`
- `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1/diff-overview.png`

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- Optional: run the same compare pass with forced locale parity for both apps to isolate content-only differences.

## 2026-02-28 18:30 CST - Codex (Playwright MCP) - local
### Scope
- Users admin parity pass for `/admin/users`, `/admin/users/[userId]`, and `/admin/users/[userId]/edit`.

### Preconditions
- VecinoHub running at `http://localhost:3000`.
- Admin session available.

### Accounts Used
- Admin session already active in browser context.

### Steps Executed
- Opened `/admin/users` and verified table structure, filters, pagination, and row links.
- Opened one user detail route from the list and verified detail actions moved there.
- Opened edit route from detail and verified role/status form layout.
- Submitted edit form without changing values to validate route/action flow.

### Results
- PASS: User list now links to detail rows (`user-list-detail-<id>`), with no inline row action buttons.
- PASS: User detail page renders role/status action buttons and memberships/stats.
- PASS: User edit form route works and returns to detail after submit.

### Issues
- Non-blocking dev-only hydration warning still appears in console overlay (existing behavior).

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None (submit was performed without changing values).

### Cleanup Needed
- None.

### Next Actions
- Optional: run an additional mutation+revert check for detail action toggles on a dedicated test user.

## 2026-02-28 17:19 CST - Codex (Playwright) - local
### Scope
- Focused redesign review for `/admin/posts/new`.

### Preconditions
- VecinoHub running at `http://127.0.0.1:3000`.
- Admin account available.

### Accounts Used
- Admin: `admin@vecinohub.local` / `Admin123!`.

### Steps Executed
- Captured post-create page screenshot after redesign implementation.
- Captured full-page screenshot for section/layout verification.
- Ran functional smoke flow: fill title/content and submit.

### Results
- PASS: `/admin/posts/new` now uses redesign-style sectioned layout with preview sidebar and publish settings.
- PASS: Create-post submit flow still works and redirects to `/admin/posts`.

### Issues
- None.

### Artifacts
- `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/posts-new/vecino-posts-new-after.png`
- `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/posts-new/vecino-posts-new-after-full.png`

### Data Created
- One post created via smoke test: title prefix `Post UI Review`.

### Data Modified
- None.

### Cleanup Needed
- Optional: delete smoke-test post from admin posts list.

### Next Actions
- If needed, apply same form-shell parity to `/admin/posts/[postId]/edit` for full create/edit consistency.


## 2026-02-28 17:11 CST - Codex (Playwright) - local
### Scope
- Admin redesign visual parity pass against `/Users/angel/Downloads/vecinohub-redesign`.
- Routes compared: `/admin`, `/admin/users`, `/admin/groups`, `/admin/polls`, `/admin/fundraising`, `/admin/events`, `/admin/posts`.

### Preconditions
- Redesign app running at `http://127.0.0.1:4173`.
- VecinoHub app running at `http://127.0.0.1:3000`.
- Seed data available and admin account can authenticate.

### Accounts Used
- Redesign: `admin@example.com` / `admin123`.
- VecinoHub: `admin@vecinohub.local` / `Admin123!`.

### Steps Executed
- Captured section screenshots with `output/playwright/admin-pass/capture-compare-pass1.mjs`.
- Computed pixel diffs with `output/playwright/admin-pass/diff-pass1.mjs`.
- Implemented UI parity pass (admin shell, overview, and list tables), re-ran capture and diff.

### Results
- PASS: Admin shell now matches redesign structure (active sidebar state, topbar breadcrumb/avatar, spacing, cards/tables).
- PASS: Lint clean (`npm run lint`).
- PASS: Production build clean (`npm run build`).
- PASS: Visual mismatch reduced on all compared routes.
- PASS: Mismatch metrics after latest pass:
  - overview: `3.30%`
  - users: `2.48%`
  - groups: `1.03%`
  - polls: `1.33%`
  - fundraising: `1.27%`
  - events: `1.36%`
  - posts: `1.37%`

### Issues
- Remaining differences are mostly content/locale driven (EN redesign fixtures vs ES app copy and real DB data), not major layout mismatches.

### Artifacts
- Screenshots and diffs in `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1/`.
- Scripts used:
  - `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/capture-compare-pass1.mjs`
  - `/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/diff-pass1.mjs`

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- Optional final pass: compare with forced English locale snapshots to isolate non-structural text/content differences.


## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Admin Overview Loads.

### Preconditions
- App running at `http://localhost:3000`.
- Seed data loaded (admin account available).

### Accounts Used
- Admin: `admin@vecinohub.local` / `Admin123!`

### Steps Executed
- Logged in at `/login` as admin.
- Visited `/admin` and verified overview stats and list sections.

### Results
- PASS: Admin overview renders with stats cards and list sections.

### Issues
- None.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- None.

## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Non-Admin Cannot Access Admin Routes.

### Preconditions
- App running at `http://localhost:3000`.
- Seed data loaded (member account available).

### Accounts Used
- Member: `ana@vecinohub.local` / `User123!`

### Steps Executed
- Visited `/admin`, `/admin/posts`, `/admin/polls`, `/admin/events`, `/admin/fundraising` while logged in as member.

### Results
- PASS: Each admin route redirected to `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f`.

### Issues
- None.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- None.

## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Group Dashboard Nav.

### Preconditions
- App running at `http://localhost:3000`.
- Member logged in and group selected.

### Accounts Used
- Member: `ana@vecinohub.local` / `User123!`

### Steps Executed
- Opened `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f`.
- Opened `Members` link to `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/members`.
- Attempted to use navigation links for Polls, Fundraising, Events, Posts.

### Results
- FAIL: Navigation links/test ids were not available on the members page, so navigation between sections could not be verified.

### Issues
- Issue: Group dashboard navigation links not visible on members page.
  - Symptom: No nav links or `nav-*` test ids present to reach Polls/Fundraising/Events/Posts.
  - Path: `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/members`.
  - Repro: Log in as member, go to members list, look for nav links.
  - Expected: Visible nav links for Members, Polls, Fundraising, Events, Posts.
  - Actual: Nav links not present; cannot navigate between sections.
  - Errors: None observed.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- Restore or surface group nav links on dashboard pages.

## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Dashboard Overview Loads.

### Preconditions
- App running at `http://localhost:3000`.
- Member logged in.

### Accounts Used
- Member: `ana@vecinohub.local` / `User123!`

### Steps Executed
- Visited `/dashboard`.
- Verified overview sections for posts, events, polls, fundraising, members.
- Confirmed group selection control is visible as the header group button.

### Results
- PASS: Dashboard overview sections render for group `Casa 101`.

### Issues
- None.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- None.

## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Root Redirect.

### Preconditions
- App running at `http://localhost:3000`.
- Seed data loaded (member account available).

### Accounts Used
- Member: `ana@vecinohub.local` / `User123!`

### Steps Executed
- Visited `/` while logged out and confirmed redirect to `/login`.
- Logged in at `/login` and then visited `/` again.

### Results
- PASS: Logged out user redirected to `/login`; logged in user landed on `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f`.

### Issues
- None.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- None.

## 2026-01-30 00:27 CST - OpenCode (Playwright MCP) - local
### Scope
- Test Run: Login and Logout.

### Preconditions
- App running at `http://localhost:3000`.
- Seed data loaded (member account available).

### Accounts Used
- Member: `ana@vecinohub.local` / `User123!`

### Steps Executed
- Logged in at `/login` and verified redirect to `/dashboard`.
- Opened user menu and signed out.

### Results
- PASS: Session active after login; logout redirected to `/login`.

### Issues
- None.

### Artifacts
- None.

### Data Created
- None.

### Data Modified
- None.

### Cleanup Needed
- None.

### Next Actions
- None.

## 2026-01-30 10:35 PST - OpenCode (Playwright MCP) - local
### Scope
- Followed `docs/PLAYWRIGHT_TEST_RUNS.md` across Auth, Profile, Admin CRUD, Fundraising, Member flows, Access Control, and Home.

### Preconditions
- App running at `http://localhost:3000`.
- Seed data loaded (admin + member accounts available).

### Accounts Used
- Admin: `admin@vecinohub.local` / `Admin123!`
- Member: `ana@vecinohub.local` / `User123!`
- New user: `testrunner+20260129@vecinohub.local` / `Test123!`

### Steps Executed
- Auth: registered new user at `/register`, redirected to `/dashboard`.
- Profile: updated username to `test.runner` and language to English at `/profile`, saved.
- Admin: created group `/admin/groups/new`, poll `/admin/polls/new` + options, event `/admin/events/new`, post `/admin/posts/new` (published), campaign `/admin/fundraising/new`.
- Fundraising: confirmed a submitted contribution on `/admin/fundraising/f84a2e78-00a5-40c4-9b4a-880a065c4521` and confirmed a wire contribution on `/admin/fundraising/ccd5a767-365f-46ad-98b1-703720a92dc9`.
- Member: viewed members/events/posts lists, submitted cash + wire contributions on `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/fundraising/ccd5a767-365f-46ad-98b1-703720a92dc9/contribute`, verified status update on `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/fundraising/ccd5a767-365f-46ad-98b1-703720a92dc9`.
- Access control: attempted `/admin` and `/admin/posts` as member.
- Home: attempted `/` while logged out.

### Results
- PASS: Registration redirect to `/dashboard`.
- PASS: Profile update persisted and session language changed UI strings to English.
- PASS: Admin created group, poll, event, post, and campaign; items visible in lists.
- PASS: Member cash and wire contributions submitted; totals updated.
- PASS: Admin confirmation reflected on member contribution status.
- PASS: Member redirected away from `/admin` and `/admin/posts`.
- FAIL: Empty dashboard for new user shows untranslated keys.
- FAIL: Profile update toast remained in Spanish after language switched to English.
- FAIL: Poll voting allows overwriting existing vote (warning shown, but submit still allowed).
- BLOCKED: Non-member poll access check inconclusive because member can switch to `Casa 202` (no known non-member group).
- FAIL: Unauthenticated `/` redirects to `/login`; public landing page not verifiable.

### Issues
- Issue: New user dashboard shows translation keys instead of localized text.
  - Symptom: Heading displays `dashboard.empty.title` and body shows `dashboard.empty.body`.
  - Path: `/dashboard` immediately after new registration.
  - Repro: Register a new user at `/register`, wait for redirect to `/dashboard`.
  - Expected: Human-readable empty state copy.
  - Actual: Raw translation keys displayed.
  - Errors: No visible toast; console showed Next.js dev overlay with 1 issue badge.
- Issue: Profile update toast not localized after language switch.
  - Symptom: After setting language to English, success toast text was Spanish (`Perfil actualizado.`).
  - Path: `/profile`.
  - Repro: Open `/profile`, set language to English, save.
  - Expected: Toast in English.
  - Actual: Toast in Spanish.
  - Errors: None observed.
- Issue: Poll vote overwrite allowed for group that already voted.
  - Symptom: UI warns about overwrite but still allows submitting a new vote.
  - Path: `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/polls/dffec171-e749-4b8e-9b5a-9543ad0a001d`.
  - Repro: Select alternate option and click `Cast vote` when warning shows.
  - Expected: Block vote or require explicit confirmation.
  - Actual: Vote submission allowed.
  - Errors: None observed.
- Issue: Home page redirects to login when unauthenticated.
  - Symptom: Navigating to `/` while logged out loads `/login`.
  - Path: `/`.
  - Repro: Log out and navigate to `/`.
  - Expected: Public marketing/home page per test run.
  - Actual: Redirect to `/login`.
  - Errors: None observed.

### Artifacts
- None.

### Data Created
- Group: `Casa Test 20260129-1` (`/admin/groups/e749a00e-b153-4a69-b1a0-0016b5664e2f`).
- Poll: `Poll Test 20260129-1` (`/admin/polls/e4be435c-9591-442a-972a-3cd88716b2dc`).
- Poll options: `Option A` (amount 100), `Option B` (amount 0).
- Event: `Event Test 20260129-1` (`/admin/events/a69a54a7-cc72-4e21-9ff1-3666dc4961c7`).
- Post: `Post Test 20260129-1` (published) (`/admin/posts/d89159fe-25e0-49a5-b033-7417fa2534da`).
- Campaign: `Campaign Test 20260129-1` (`/admin/fundraising/ccd5a767-365f-46ad-98b1-703720a92dc9`).
- User: `testrunner+20260129@vecinohub.local`.
- Contributions: cash MX$50 and wire MX$75 on `Campaign Test 20260129-1`.

### Data Modified
- Contribution status updated to Confirmed on `Pago de seguridad` campaign:
  `/admin/fundraising/f84a2e78-00a5-40c4-9b4a-880a065c4521`.
- Contribution status updated to Confirmed for wire transfer on `Campaign Test 20260129-1`:
  `/admin/fundraising/ccd5a767-365f-46ad-98b1-703720a92dc9`.
- Poll vote changed from `Si` to `No` on:
  `/dashboard/4df5a72e-9899-492a-91e8-95f387ce5a7f/polls/dffec171-e749-4b8e-9b5a-9543ad0a001d`.
- Profile updated for new user: username set to `test.runner`, language to English.

### Cleanup Needed
- Remove created group, poll (and options), event, post, campaign, test user, and contributions created for `Campaign Test 20260129-1`.

### Next Actions
- Fix empty dashboard translations (missing messages or incorrect namespace).
- Localize profile success toast by current language.
- Decide whether vote overwrite should be blocked or require explicit confirmation.
- Clarify whether `/` should be public or redirect to `/login`.
