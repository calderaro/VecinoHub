# Playwright Test Logs

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
