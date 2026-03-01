# Playwright Test Runs by Feature

Purpose: define manual, repeatable Playwright runs per feature so agents can validate the app end to end. These are written as deterministic flows with clear preconditions and expected results.

## Conventions
- Use stable, seeded data where possible. If none exists, create data within the flow.
- Use unique, timestamped names to avoid collisions.
- Prefer visible text and roles for selectors; avoid brittle CSS.
- Always verify access control (expected redirect or error) when applicable.

## Global Preconditions
- App is running at http://localhost:3000
- Database is available and migrations applied.
- Seed data is loaded (or flows create required data).
- A user account with role admin exists.
- A user account with role member exists.

### Environment Setup (Recommended)
Use these steps before the first run or when data is missing.

Commands:
- npm install
- npm run db:up
- npm run db:generate
- npm run db:migrate
- npm run seed

Seeded Accounts (if available):
- Admin email: admin@vecinohub.local
- Admin password: Admin123!
- Member email: ana@vecinohub.local
- Member password: User123!
- Member email: luis@vecinohub.local
- Member password: User123!

If seeding does not create users, create them via the UI in the Auth runs.

## Playwright MCP Selector Guidance
Use these selector patterns to keep tests stable:

- Prefer roles: getByRole("button", { name: "..." })
- Prefer labels: getByLabel("Email") for inputs
- Prefer headings: getByRole("heading", { name: "..." })
- Prefer link names: getByRole("link", { name: "..." })
- Prefer data-testid for critical flows
- Avoid layout selectors (nth-child, deep CSS)

Common UI anchors:
- Login/Registration header: heading with auth title text
- Primary submit buttons: button with action text (Sign in, Create account)
- Navigation: links labeled Polls, Events, Posts, Fundraising, Members

Overview Sections:
- landing-root
- landing-header
- landing-main
- landing-hero
- landing-overview-card
- landing-legal-section
- landing-footer
- dashboard-overview-posts
- dashboard-overview-events
- dashboard-overview-polls
- dashboard-overview-fundraising
- dashboard-overview-members
- dashboard-overview-root
- dashboard-overview-title
- dashboard-no-group-state
- dashboard-no-group-status
- admin-overview-stats
- admin-overview-stats-polls
- admin-overview-stats-fundraising
- admin-overview-stats-events
- admin-overview-stats-posts
- admin-overview-stats-users
- admin-overview-stats-groups
- admin-overview-polls
- admin-overview-fundraising
- admin-overview-events
- admin-overview-posts
- admin-overview-root
- admin-overview-title
- admin-overview-quick-create
- legal-page-root
- legal-page-content
- legal-nav
- legal-nav-terms
- legal-nav-privacy
- legal-nav-data-deletion
- legal-home-root
- legal-terms-root
- legal-privacy-root
- legal-data-deletion-root

## data-testid Map
Use getByTestId for these anchors.

Auth:
- auth-shell
- auth-shell-card
- auth-social-google
- auth-social-facebook
- auth-login-email
- auth-login-password
- auth-login-submit
- auth-login-error
- auth-register-name
- auth-register-email
- auth-register-password
- auth-register-submit
- auth-register-error

Navigation:
- nav-dashboard
- nav-members
- nav-polls
- nav-fundraising
- nav-events
- nav-posts
- user-menu-trigger
- user-menu-signout
- group-selector

Landing:
- landing-root
- landing-header
- landing-main
- landing-hero
- landing-login-link
- landing-cta-login
- landing-cta-legal-hub
- landing-overview-card
- landing-legal-section
- landing-legal-terms
- landing-legal-privacy
- landing-legal-deletion
- landing-footer
- landing-legal-terms-footer
- landing-legal-privacy-footer
- landing-legal-deletion-footer

Legal:
- legal-page-root
- legal-page-content
- legal-nav
- legal-nav-terms
- legal-nav-privacy
- legal-nav-data-deletion
- legal-home-root
- legal-terms-root
- legal-privacy-root
- legal-data-deletion-root

Admin Lists:
- admin-groups-search
- admin-groups-filter
- admin-groups-add
- admin-groups-table
- admin-polls-search
- admin-polls-status
- admin-polls-filter
- admin-polls-add
- admin-polls-table
- admin-events-search
- admin-events-filter
- admin-events-add
- admin-events-table
- admin-posts-search
- admin-posts-status
- admin-posts-filter
- admin-posts-add
- admin-posts-table
- admin-fundraising-search
- admin-fundraising-status
- admin-fundraising-filter
- admin-fundraising-add
- admin-fundraising-table
- admin-users-root
- admin-users-title
- admin-users-table
- admin-users-search
- admin-users-role
- admin-users-status
- admin-users-row-<id>
- user-list-detail-<id>
- admin-users-pagination
- admin-users-prev
- admin-users-next
- admin-groups-row-<id>
- admin-polls-row-<id>
- admin-events-row-<id>
- admin-posts-row-<id>
- admin-fundraising-row-<id>

Dashboard Lists:
- dashboard-polls-search
- dashboard-polls-filter
- dashboard-polls-table
- dashboard-events-search
- dashboard-events-filter
- dashboard-events-table
- dashboard-posts-search
- dashboard-posts-filter
- dashboard-posts-table
- dashboard-fundraising-search
- dashboard-fundraising-filter
- dashboard-fundraising-table
- dashboard-members-list
- dashboard-polls-row-<id>
- dashboard-events-row-<id>
- dashboard-posts-row-<id>
- dashboard-fundraising-row-<id>

Poll Management:
- poll-list-detail-<id>
- poll-detail-back
- poll-detail-edit
- poll-options-add
- poll-options-list
- poll-options-save
- poll-options-cancel
- poll-form-title
- poll-form-description
- poll-form-status
- poll-form-submit
- poll-form-submit-mobile
- poll-form-add-option
- poll-form-option-label-<index>
- poll-admin-launch
- poll-admin-reset
- poll-admin-close
- poll-admin-reopen
- poll-admin-confirm
- admin-poll-results-row-<id>

Group Members:
- group-members-add
- group-members-add-submit
- group-members-add-cancel
- group-members-remove-confirm
- group-members-remove-cancel
- group-members-row-<id>

Groups:
- group-list-detail-<id>
- group-detail-back
- group-detail-edit
- group-admin-delete
- group-admin-delete-cancel
- group-admin-delete-confirm
- group-form-name
- group-form-address
- group-form-admin
- group-form-submit
- group-form-submit-mobile

Users:
- user-detail-root
- user-detail-back
- user-detail-edit
- user-detail-toggle-role
- user-detail-toggle-status
- user-detail-memberships
- user-detail-membership-<id>
- user-form-role
- user-form-status
- user-form-submit
- user-form-submit-mobile

Fundraising:
- campaign-list-detail-<id>
- campaign-detail-back
- campaign-detail-edit
- campaign-detail-submit-contribution
- campaign-admin-close
- campaign-admin-close-confirm
- campaign-admin-close-cancel
- contribution-status-open
- contribution-status-save
- contribution-status-cancel
- campaign-form-title
- campaign-form-goal
- campaign-form-description
- campaign-form-due
- campaign-form-status
- campaign-form-submit
- campaign-form-submit-mobile
- contribution-form-group
- contribution-form-method
- contribution-form-amount
- contribution-form-reference
- contribution-form-date
- contribution-form-submit

Posts:
- post-admin-publish
- post-admin-unpublish
- post-admin-delete
- post-admin-delete-confirm
- post-admin-delete-cancel
- post-list-detail-<id>
- post-detail-back
- post-detail-edit
- post-form-title
- post-form-status
- post-form-content
- post-form-submit

Events:
- event-admin-delete
- event-admin-delete-confirm
- event-admin-delete-cancel
- event-list-detail-<id>
- event-detail-back
- event-detail-edit
- event-form-title
- event-form-start
- event-form-end
- event-form-location
- event-form-description
- event-form-submit

Profile:
- profile-username
- profile-photo
- profile-language
- profile-submit

## Feature: Public Landing
### Test Run: Signed-Out User Sees Landing and Legal Links
Preconditions:
- User is signed out.

Steps:
1. Go to `/`.
2. Verify `landing-root`, `landing-hero`, and `landing-legal-section` render.
3. Click `landing-cta-login` and verify redirect to `/login`.
4. Go back to `/`.
5. Open `landing-legal-terms`, `landing-legal-privacy`, and `landing-legal-deletion`.

Expected:
- Landing page renders modern marketing shell for signed-out users.
- Login CTA routes to `/login`.
- All legal links resolve correctly.

### Test Run: Authenticated User Redirect From Root
Preconditions:
- User is logged in.

Steps:
1. Go to `/`.
2. Observe navigation behavior.

Expected:
- User is redirected to `/dashboard`.

## Feature: Auth
### Test Run: Register New User
Preconditions:
- No existing user with the test email.

Steps:
1. Go to `/register` and verify redirect to `/login?tab=signup`.
2. Fill `auth-register-name`, `auth-register-email`, `auth-register-password`.
3. Submit registration with `auth-register-submit`.
4. Verify redirect to `/dashboard`.

Expected:
- User is logged in and sees dashboard shell.

### Test Run: Login and Logout
Preconditions:
- Existing user credentials available.

Steps:
1. Go to /login.
2. Fill `auth-login-email` and `auth-login-password`.
3. Submit with `auth-login-submit`.
4. Verify redirect to /dashboard.
5. Open user menu and sign out.

Expected:
- Session is active after login.
- After sign out, user is redirected to /login.

### Test Run: Session Persistence
Preconditions:
- User is logged in.

Steps:
1. Refresh the page on /dashboard.
2. Open another route (ex: /profile).

Expected:
- Session remains active, no redirect to /login.

### Test Run: Social Auth Redirect
Preconditions:
- Valid Google/Facebook OAuth credentials are configured server-side.

Steps:
1. Go to `/login`.
2. Click `auth-social-google`.
3. Verify browser is redirected to Google OAuth consent/login page.
4. Go back to `/login`.
5. Click `auth-social-facebook`.
6. Verify browser is redirected to Facebook OAuth consent/login page.

Expected:
- Social buttons trigger external provider auth flow.

### Test Run: OTP/Reset Disabled Feature Messaging
Preconditions:
- `NEXT_PUBLIC_AUTH_OTP_ENABLED` is unset or `false`.

Steps:
1. Go to `/login`.
2. Click “Forgot password?” link.
3. Verify OTP/reset disabled notice appears.

Expected:
- User remains on auth page and receives the expected informational notice.

## Feature: Groups
### Test Run: Admin Creates Group
Preconditions:
- Admin user logged in.

Steps:
1. Go to /admin/groups.
2. Click Add Group.
3. Fill group name and address.
4. Submit.
5. Verify new group appears in the list.

Expected:
- Group is created and visible in list and detail page.

### Test Run: Admin Assigns Group Admin
Preconditions:
- Admin logged in.
- A group exists.
- A member user exists with known user id.

Steps:
1. Go to /admin/groups/{groupId}/edit.
2. Enter the admin user id in the Admin User field.
3. Save.
4. Open group detail and verify badge and admin user id.

Expected:
- Group admin is assigned and shown in the group detail.

### Test Run: Group Admin Adds Member
Preconditions:
- Group admin logged in.
- Group exists.
- A user email exists to add.

Steps:
1. Go to /dashboard/{groupId}/members.
2. Click Add Member.
3. Enter member email.
4. Submit.

Expected:
- Member is added to the list.

### Test Run: Group Admin Removes Member
Preconditions:
- Group admin logged in.
- Group has at least one non-admin member.

Steps:
1. Go to /dashboard/{groupId}/members.
2. Click Remove on a member.
3. Confirm removal.

Expected:
- Member disappears from list.

### Test Run: Member Views Group Members
Preconditions:
- Member logged in and belongs to a group.

Steps:
1. Go to /dashboard/{groupId}/members.

Expected:
- Members list loads and is visible.

## Feature: Polls
### Test Run: Admin Creates Poll and Options
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/polls/new.
2. Create a poll with title and description.
3. Open poll detail.
4. Add two options.

Expected:
- Poll exists and options are listed.

### Test Run: Group Member Votes Once
Preconditions:
- Active poll exists.
- Member logged in and belongs to a group eligible to vote.

Steps:
1. Go to /dashboard/{groupId}/polls.
2. Open an active poll.
3. Select an option and submit vote.
4. Attempt to vote again.

Expected:
- Vote is accepted once and second attempt is blocked or shows already voted.

### Test Run: Admin Sees Results Summary
Preconditions:
- Poll has at least one vote.
- Admin logged in.

Steps:
1. Go to /admin/polls/{pollId}.
2. Scroll to Results section.

Expected:
- Results table shows vote counts and participation.

## Feature: Events
### Test Run: Admin Creates Event
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/events/new.
2. Fill title, start time, location, description.
3. Submit.
4. Verify event appears in list.

Expected:
- Event is created and visible in list and detail.

### Test Run: Member Views Event Detail
Preconditions:
- Event exists.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/events.
2. Open event detail.

Expected:
- Event details show title, date/time, location, description.

## Feature: Posts
### Test Run: Admin Creates and Publishes Post
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/posts/new.
2. Create post as draft.
3. Open post detail and publish.
4. Verify post appears in member list.

Expected:
- Post is published and visible to members.

### Test Run: Member Views Post Detail
Preconditions:
- Published post exists.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/posts.
2. Open post detail.

Expected:
- Post content is visible and formatted.

## Feature: Fundraising
### Test Run: Admin Creates Campaign
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/fundraising/new.
2. Fill title, goal amount, description, due date.
3. Submit.
4. Verify campaign appears in list.

Expected:
- Campaign is created and visible.

### Test Run: Member Submits Cash Contribution
Preconditions:
- Open campaign exists.
- Member logged in and belongs to a participating group.

Steps:
1. Go to /dashboard/{groupId}/fundraising/{campaignId}/contribute.
2. Select group and cash method.
3. Enter amount.
4. Submit.

Expected:
- Contribution is created with status submitted.

### Test Run: Member Submits Wire Transfer Contribution
Preconditions:
- Open campaign exists.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/fundraising/{campaignId}/contribute.
2. Select wire transfer.
3. Enter amount, reference, date.
4. Submit.

Expected:
- Contribution is created with status submitted and wire fields saved.

### Test Run: Admin Confirms Contribution
Preconditions:
- Submitted contribution exists.
- Admin logged in.

Steps:
1. Go to /admin/fundraising/{campaignId}.
2. Find a submitted contribution.
3. Open status dialog and confirm.

Expected:
- Contribution status changes to confirmed.

### Test Run: Member Sees Updated Status
Preconditions:
- A contribution for the member is confirmed.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/fundraising/{campaignId}.
2. Verify contribution status.

Expected:
- Status reflects confirmation.

## Feature: Access Control
### Test Run: Non-Admin Cannot Access Admin Routes
Preconditions:
- Member logged in.

Steps:
1. Attempt to visit /admin.
2. Attempt to visit /admin/posts, /admin/polls, /admin/events, /admin/fundraising.

Expected:
- User is redirected away from admin routes.

### Test Run: User Cannot Edit Other Groups
Preconditions:
- Member logged in.
- Another group exists.

Steps:
1. Attempt to open /admin/groups/{otherGroupId}/edit.

Expected:
- Access denied or redirect.

### Test Run: User Cannot Vote for Non-Member Group
Preconditions:
- Member logged in.
- Another group exists with active poll.

Steps:
1. Attempt to open /dashboard/{otherGroupId}/polls/{pollId}.

Expected:
- Access denied or redirect.

## Feature: App Shell and Navigation
### Test Run: Root Redirect
Preconditions:
- None.

Steps:
1. Go to /.
2. If logged out, verify redirect to /login.
3. Log in, then visit / again.

Expected:
- Logged out users are redirected to /login.
- Logged in users land on /dashboard.

### Test Run: Dashboard Overview Loads
Preconditions:
- Member logged in.

Steps:
1. Go to /dashboard.
2. Verify group selection is available.
3. Select a group if not already selected.
4. Verify the 5 overview cards using:
   - dashboard-overview-posts
   - dashboard-overview-events
   - dashboard-overview-polls
   - dashboard-overview-fundraising
   - dashboard-overview-members

Expected:
- Dashboard overview renders sections for posts, events, polls, fundraising, members.

### Test Run: Dashboard No Group State
Preconditions:
- Logged in user without any group memberships.

Steps:
1. Go to /dashboard.
2. Verify the no-group waiting card appears.
3. Verify status pill appears.

Expected:
- `dashboard-no-group-state` is visible.
- `dashboard-no-group-status` is visible.

### Test Run: Group Dashboard Nav
Preconditions:
- Member logged in.
- Group selected.

Steps:
1. Use nav to open Members, Polls, Fundraising, Events, Posts.
2. Verify each list page loads.

Expected:
- Navigation works and pages render.

### Test Run: Admin Overview Loads
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin.
2. Verify stats cards exist and list sections show data.

Expected:
- Admin overview renders without errors.

### Test Run: Profile Update
Preconditions:
- User logged in.

Steps:
1. Go to /profile.
2. Update username and language.
3. Save.

Expected:
- Success toast appears and values persist after refresh.

### Test Run: Legal Pages Load
Preconditions:
- App running.

Steps:
1. Go to `/en`.
2. Open Terms of Service from the legal nav.
3. Open Privacy Policy from the legal nav.
4. Open Data Deletion Guide from the legal nav.

Expected:
- All legal pages render with legal navigation and content sections.

### Test Run: Admin Users List
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/users.
2. Use search and filters.
3. Open a user from the list.
4. Use detail actions or edit form to update role/status.

Expected:
- User detail opens from list links and changes persist after refresh.

## Feature: Admin CRUD Coverage
### Test Run: Admin Edits Group
Preconditions:
- Admin logged in.
- Group exists.

Steps:
1. Go to /admin/groups/{groupId}/edit.
2. Change name or admin user id.
3. Save.

Expected:
- Group updates persist in detail view.

### Test Run: Admin Edits Poll
Preconditions:
- Admin logged in.
- Poll exists.

Steps:
1. Go to /admin/polls/{pollId}/edit.
2. Update title or status.
3. Save.

Expected:
- Poll updates persist in detail view.

### Test Run: Admin Edits Event
Preconditions:
- Admin logged in.
- Event exists.

Steps:
1. Go to /admin/events/{eventId}/edit.
2. Update title or time.
3. Save.

Expected:
- Event updates persist in detail view.

### Test Run: Admin Edits Post
Preconditions:
- Admin logged in.
- Post exists.

Steps:
1. Go to /admin/posts/{postId}/edit.
2. Update title or content.
3. Save.

Expected:
- Post updates persist in detail view.

### Test Run: Admin Edits Fundraising Campaign
Preconditions:
- Admin logged in.
- Campaign exists.

Steps:
1. Go to /admin/fundraising/{campaignId}/edit.
2. Update goal or status.
3. Save.

Expected:
- Campaign updates persist in detail view.

## Test Run Logging
All Playwright run logs must go in `docs/PLAYWRIGHT_TEST_LOGS.md` to keep this file clean.
Log after each test run (no exceptions), even if the run is partial or blocked.

Log format (append newest first):
- Title line: `## YYYY-MM-DD HH:MM TZ - <runner> - <environment>`
- Required sections in order (use `###` headings):
  - `### Scope`
  - `### Preconditions`
  - `### Accounts Used`
  - `### Steps Executed`
  - `### Results`
  - `### Issues`
  - `### Artifacts`
  - `### Data Created`
  - `### Data Modified`
  - `### Cleanup Needed`
  - `### Next Actions`

Content rules:
- Be explicit and descriptive. Each issue must include: symptom, exact path, steps to reproduce, expected vs actual, and any console/network errors seen.
- Include exact URLs, ids, and labels used so another agent can re-run.
- Mark each item as `PASS`, `FAIL`, or `BLOCKED` in Results.
- If no issues, write `None.` under Issues.
- If cleanup is required, list specific entities with ids and routes.

### Test Run: Admin Submits Contribution
Preconditions:
- Admin logged in.
- Campaign exists and is open.

Steps:
1. Go to /admin/fundraising/{campaignId}/contribute.
2. Select group and payment method.
3. Enter amount (and wire reference/date if needed).
4. Submit.

Expected:
- Contribution is created and visible in campaign detail.

## Feature: Dashboard Detail Views
### Test Run: Member Views Poll Detail
Preconditions:
- Poll exists.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/polls/{pollId}.

Expected:
- Poll title, description, and options render.

### Test Run: Member Views Fundraising Campaign Detail
Preconditions:
- Campaign exists.
- Member logged in.

Steps:
1. Go to /dashboard/{groupId}/fundraising/{campaignId}.

Expected:
- Campaign detail shows title, amount, and contributions list.
