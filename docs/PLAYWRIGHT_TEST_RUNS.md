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
- A `platform_admin` account exists.
- At least one `neighborhood_admin` and one `neighbor` account exist.

### Environment Setup (Recommended)
Use these steps before the first run or when data is missing.

Commands:
- npm install
- npm run db:up
- npm run db:generate
- npm run db:migrate
- npm run seed

Seeded Accounts (if available):
- Platform admin: admin@vecinohub.local / Admin123!
- Neighborhood admin (Centro): ana@vecinohub.local / User123!
- Neighborhood admin (Sur): luis@vecinohub.local / User123!

## Feature: Multi-Neighborhood and Platform Admin

### Test Run: Platform Admin Creates Neighborhood
Preconditions:
- Logged in as `platform_admin`.

Steps:
1. Go to `/platform`.
2. Fill `platform-neighborhood-name` and `platform-neighborhood-slug` with unique values.
3. Submit `platform-neighborhood-submit`.
4. Confirm a new row appears in `platform-neighborhoods-list`.

Expected:
- New neighborhood is created and listed immediately after refresh.

### Test Run: Platform Admin Opens Neighborhood Details
Preconditions:
- Logged in as `platform_admin`.
- At least one neighborhood exists.

Steps:
1. Go to `/platform`.
2. Click one row or `platform-neighborhood-link-{id}`.
3. Verify `platform-neighborhood-detail-root` renders.
4. Verify the members section renders or shows `platform-neighborhood-members-empty`.

Expected:
- User reaches `/platform/{neighborhoodId}` and can inspect neighborhood metadata plus users.

### Test Run: Platform Admin Manages Neighborhood Members
Preconditions:
- Logged in as `platform_admin`.
- At least one neighborhood exists.
- An existing app user exists that is not yet in the target neighborhood.

Steps:
1. Open `/platform/{neighborhoodId}`.
2. Open `platform-neighborhood-add-member`.
3. Fill `platform-neighborhood-add-member-email` with the existing user email.
4. Select a role in `platform-neighborhood-add-member-role`.
5. Submit `platform-neighborhood-add-member-submit`.
6. Change that user via `platform-neighborhood-member-role-{userId}`.
7. Change that user via `platform-neighborhood-member-status-{userId}`.

Expected:
- The user appears in the membership list, role changes persist, and membership status changes persist.

### Test Run: Platform Admin Edits Neighborhood
Preconditions:
- Logged in as `platform_admin`.
- At least one neighborhood exists.

Steps:
1. Open `/platform/{neighborhoodId}`.
2. Click `platform-neighborhood-edit`.
3. Update `platform-neighborhood-edit-name` or `platform-neighborhood-edit-slug`.
4. Submit `platform-neighborhood-edit-submit`.

Expected:
- User returns to the detail page and sees updated values.

### Test Run: Platform Admin Deletes Neighborhood
Preconditions:
- Logged in as `platform_admin`.
- Create a disposable neighborhood for this run.

Steps:
1. Open `/platform/{neighborhoodId}` for the disposable neighborhood.
2. Click `platform-neighborhood-delete`.
3. Confirm deletion in the dialog.
4. Verify redirect back to `/platform`.

Expected:
- Neighborhood is removed from the platform list and related neighborhood-scoped data is deleted.

### Test Run: Neighborhood Admin Cannot Access Platform
Preconditions:
- Logged in as neighborhood admin (non-platform).

Steps:
1. Navigate directly to `/platform`.

Expected:
- User is redirected away from `/platform` (to `/` by current guard behavior).

### Test Run: Active Neighborhood Switcher Scopes Dashboard
Preconditions:
- Logged in user belongs to multiple neighborhoods.

Steps:
1. Open `user-menu-trigger` on `/dashboard/{groupId}`.
2. Click one neighborhood switch entry: `user-menu-neighborhood-{id}`.
3. Verify redirect to `/dashboard`.
4. Verify resolved group and dashboard cards belong to selected neighborhood.

Expected:
- Active neighborhood cookie is updated through tRPC and SSR data is neighborhood-scoped.

### Test Run: Platform Admin Clears Active Neighborhood Scope
Preconditions:
- Logged in as platform admin with active neighborhood set.

Steps:
1. Open `user-menu-trigger`.
2. Click `user-menu-neighborhood-platform-all`.
3. Refresh and verify global platform views are no longer constrained to a single neighborhood.

Expected:
- `vh_active_neighborhood` cookie is cleared and global context is restored.

If seeding does not create users, create them via the UI in the Auth runs.

## Feature: Group Roles and Memberships

### Test Run: Group Admin Manages Own Group
Preconditions:
- Logged in as a user with an active `group_admin` membership for the target group.
- A second existing user account exists and is not yet an active member of the target group.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Verify `group-members-add` is visible.
3. Send an invite with `group-members-add`, `group-members-add-role`, and `group-members-add-submit`.
4. Sign in as the invited user and accept the invite in `/dashboard/invites`.
5. Sign back in as the group admin.
6. Change that user via `group-members-role-{userId}`.
7. Remove that user with the remove action.

Expected:
- The group admin can invite users, remove members, and switch `group_member` / `group_admin` roles only inside their own group.

### Test Run: Group Member Is Read Only
Preconditions:
- Logged in as a user with an active `group_member` membership for the target group.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Verify the members list renders.
3. Verify `group-members-add` is not present.
4. Verify no `group-members-role-{userId}` control is shown.

Expected:
- The group member can read the roster but cannot change membership or roles.

### Test Run: Group Member Leaves Own Group
Preconditions:
- Logged in as a user with an active `group_member` membership for the target group.
- The user belongs to at least one other active group, or the dashboard empty state is acceptable for the run.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Verify the self-service leave control is visible.
3. Trigger the leave action and confirm it in the dialog.
4. Verify redirect to `/dashboard`.
5. Re-open the previous group route directly.

Expected:
- The leave action succeeds, the user loses access to the former group, and the previous group members page no longer opens for that user.

### Test Run: Leaving Last Group Revokes Resident Neighborhood Access
Preconditions:
- Logged in as a user whose only active group in the target neighborhood is the selected group.
- The user is not a `neighborhood_admin` in that neighborhood.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Leave the group and confirm.
3. Attempt to open the previous group route directly.
4. Attempt to open another resident page in the same neighborhood by URL if one exists.

Expected:
- The user cannot access any resident neighborhood surface in that neighborhood after leaving the last active group there.

### Test Run: Last Group Admin Cannot Leave
Preconditions:
- Logged in as the only active `group_admin` for the target group.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Trigger the leave action and confirm it.

Expected:
- The mutation is rejected with a clear error instructing the user to assign another group admin first, and the membership remains active.

### Test Run: Standalone Neighbor Membership Does Not Restore Resident Access
Preconditions:
- A user previously left or was removed from their last active group in a neighborhood.
- An admin reactivates or recreates a `neighbor` membership for that user without adding them to a group.

Steps:
1. Sign in as the affected user.
2. Attempt to open `/dashboard`.
3. Attempt to open a resident route in the former neighborhood directly.

Expected:
- The user still lacks resident access until an active group membership is restored.

### Test Run: Neighborhood Admin Manages Group Roles
Preconditions:
- Logged in as a `neighborhood_admin` for the target group neighborhood.

Steps:
1. Open `/dashboard/{groupId}/members` or `/admin/{neighborhoodId}/groups/{groupId}`.
2. Change a member role via `group-members-role-{userId}`.
3. Refresh the page.

Expected:
- The updated group role persists, even when the acting user is not a member of that group.

## Feature: Group Invitations

### Test Run: Existing User Accepts Group Invite
Preconditions:
- Logged in as a user with `group_admin`, `neighborhood_admin`, or `platform_admin` access to the target group.
- A second existing user account exists and is not yet an active member of the target group.

Steps:
1. Open `/dashboard/{groupId}/members`.
2. Open the invite dialog.
3. Fill the invite email with the second user account and choose a role.
4. Submit the invite.
5. Sign out and sign in as the invited user.
6. Open `/dashboard/invites`.
7. Accept the invite.
8. Open `/dashboard` and verify the group is now available.

Expected:
- The invited user sees the pending invite, acceptance succeeds, and the group membership becomes active only after acceptance.

### Test Run: New User Registers From Invite
Preconditions:
- Logged in as a user with permission to manage the target group.
- An email address that does not yet belong to any VecinoHub account is available.

Steps:
1. Send a group invite to the unused email address.
2. Open the invite email link or navigate to `/dashboard/invites?invite=<token>` while signed out.
3. Verify redirect to `/login` preserves the destination.
4. Complete sign-up and email OTP verification with that email.
5. Verify redirect back to `/dashboard/invites`.
6. Accept the invite.

Expected:
- The newly registered user lands in the invite inbox after verification, can accept the invite, and then gains access to the invited group.

## Feature: Dashboard Localization

### Test Run: Neighbor Dashboard Switches Between Spanish and English
Preconditions:
- Logged in as a user with at least one active group membership.

Steps:
1. Open `/profile`.
2. Change the language field to English and save.
3. Open `/dashboard`.
4. Verify the group selector title, empty address fallback, and `UserMenu` copy are in English.
5. Open `/dashboard/{groupId}` and verify overview cards, fundraising urgency text, contribution form, and contribution delete action are in English.
6. Return to `/profile`, change the language field to Spanish, and save.
7. Re-open `/dashboard` and `/dashboard/{groupId}` and verify the same surfaces are shown in Spanish.

Expected:
- Resident dashboard pages and resident-only shared components consistently reflect the selected language in both locales.

### Test Run: Profile Page Uses Single Settings Header
Preconditions:
- Logged in as a user with at least one active group membership.

Steps:
1. Open `/profile`.
2. Verify the back link is visible.
3. Verify there is a single visible heading for the profile settings form.
4. Verify the name, username, language, and save controls render normally.

Expected:
- `/profile` no longer shows a duplicated page-level hero above the profile form card.

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
- dashboard-no-group-signout
- admin-overview-stats
- admin-overview-stats-polls
- admin-overview-stats-fundraising
- admin-overview-stats-events
- admin-overview-stats-posts
- admin-overview-stats-users
- admin-overview-stats-groups
- admin-overview-members
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
- auth-login-email
- auth-login-password
- auth-login-magic-link
- auth-reset-request
- auth-login-notice
- auth-login-submit
- auth-login-error
- auth-register-name
- auth-register-email
- auth-register-password
- auth-register-verification-email
- auth-register-otp
- auth-register-otp-verify
- auth-register-otp-resend
- auth-register-otp-back
- auth-register-submit
- auth-register-error
- forgot-password-card
- forgot-password-email
- forgot-password-request
- forgot-password-email-readonly
- forgot-password-otp
- forgot-password-new-password
- forgot-password-confirm-password
- forgot-password-back
- forgot-password-submit
- forgot-password-back-login
- forgot-password-error
- forgot-password-notice

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
- admin-users-status
- admin-users-row-<id>
- user-list-detail-<id>
- admin-users-pagination
- admin-users-prev
- admin-users-next
- platform-manage-users-link
- platform-users-root
- platform-users-back
- platform-users-title
- platform-user-detail-root
- platform-user-detail-back
- platform-user-edit-link
- platform-user-edit-root
- platform-user-edit-back
- platform-user-edit-form
- platform-user-edit-name
- platform-user-edit-username
- platform-user-edit-language
- platform-user-edit-submit
- platform-user-management
- platform-user-role
- platform-user-status
- platform-user-save
- platform-user-neighborhood-memberships
- platform-user-group-memberships
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

Platform Users:
- Logged in as `platform_admin`.
- Open `/platform` and use `platform-manage-users-link` to reach `/platform/users`.
- Filter with `admin-users-search`, `admin-users-role`, and `admin-users-status`.
- Open a user row, change `platform-user-role` or `platform-user-status`, and save with `platform-user-save`.
- From the detail page, use `platform-user-edit-link` to reach `/platform/users/[userId]/edit`, update `platform-user-edit-name`, `platform-user-edit-username`, or `platform-user-edit-language`, and save with `platform-user-edit-submit`.
- Verify the updated badges render on the detail screen and persist after reload.

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
- user-detail-memberships
- user-detail-membership-<id>

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
- SMTP is configured, or server logs are accessible for the OTP in dev.

Steps:
1. Go to `/register` and verify redirect to `/login?tab=signup`.
2. Fill `auth-register-name`, `auth-register-email`, `auth-register-password`.
3. Submit registration with `auth-register-submit`.
4. Verify `auth-register-verification-email` shows the submitted email.
5. Fill `auth-register-otp` with the received OTP.
6. Submit with `auth-register-otp-verify`.
7. Verify redirect to `/dashboard`.

Expected:
- User is not logged in before OTP verification.
- After OTP verification, the session is active and the dashboard shell loads.

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

### Test Run: No-Group Sign Out
Preconditions:
- User is logged in and has no group memberships.

Steps:
1. Go to `/dashboard`.
2. Verify `dashboard-no-group-state` renders.
3. Click `dashboard-no-group-signout`.
4. Verify redirect to `/login`.

Expected:
- User can sign out from the no-group waiting state.

### Test Run: Social Auth Redirect
Preconditions:
- Valid Google OAuth credentials are configured server-side.

Steps:
1. Go to `/login`.
2. Click `auth-social-google`.
3. Verify browser is redirected to Google OAuth consent/login page.

Expected:
- Google triggers external OAuth.

### Test Run: Magic Link Request
Preconditions:
- Magic link plugin is enabled.
- SMTP is configured, or server logs are accessible for dev fallback.

Steps:
1. Go to `/login`.
2. Fill `auth-login-email`.
3. Click `auth-login-magic-link`.
4. Verify `auth-login-notice` shows magic-link sent feedback.

Expected:
- Request succeeds without leaving the login page.
- User receives email when SMTP is configured.

### Test Run: OTP Password Reset
Preconditions:
- Email OTP plugin is enabled.
- SMTP is configured, or server logs are accessible for dev fallback.
- Existing user email is available.

Steps:
1. Go to `/login`.
2. Click `auth-reset-request` and verify navigation to `/forgot-password`.
3. Fill `forgot-password-email`.
4. Click `forgot-password-request`.
5. Verify `forgot-password-email-readonly` shows the submitted email.
6. Fill `forgot-password-otp` with the received OTP.
7. Fill `forgot-password-new-password`.
8. Fill `forgot-password-confirm-password`.
9. Click `forgot-password-submit`.
10. Verify redirect to `/dashboard`.

Expected:
- Password reset completes on `/forgot-password`, creates a session, and redirects to `/dashboard`.

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

### Test Run: Admin Creates Group Without Members
Preconditions:
- Admin logged in.

Steps:
1. Go to /admin/groups/new.
2. Enter group name and optional address.
3. Leave the Admin Email field empty.
4. Save.
5. Open group detail.

Expected:
- Group is created successfully with zero members and no group admins assigned yet.

### Test Run: Admin Assigns Group Admin
Preconditions:
- Admin logged in.
- A group exists.
- A member user exists with known user id or email.

Steps:
1. Go to /dashboard/{groupId}/members or /admin/{neighborhoodId}/groups/{groupId}.
2. Add the user if they are not already in the group.
3. Change that user via `group-members-role-{userId}` to `group_admin`.
4. Refresh and open group detail.

Expected:
- Group admin role is assigned and shown in the group detail.

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
- Neighborhood admin or platform admin logged in.
- Target neighborhood has at least one grouped user and at least one neighborhood member with no group assignment.

Steps:
1. Go to `/admin/{neighborhoodId}/users`.
2. Use search and filters.
3. Verify only users with at least one active group membership in that neighborhood are listed.
4. As platform admin, open a user from the list and verify detail/edit still work.

Expected:
- Neighborhood admins only see grouped users and do not get user detail links.
- Platform admins can still open user detail from the same list.

### Test Run: Admin Neighborhood Members
Preconditions:
- Neighborhood admin or platform admin logged in.
- Target neighborhood has at least one member.

Steps:
1. Go to `/admin/{neighborhoodId}/members`.
2. Verify `admin-members-root` and `admin-members-manager` render.
3. Verify the list only contains neighborhood admins.
4. Open `platform-neighborhood-add-member`.
5. Add an existing user via `platform-neighborhood-add-member-email` and `platform-neighborhood-add-member-role`.
6. Submit `platform-neighborhood-add-member-submit`.
7. Open `platform-neighborhood-member-edit-{userId}`.
8. Update `platform-neighborhood-edit-member-role` and `platform-neighborhood-edit-member-status`.
9. Submit `platform-neighborhood-edit-member-submit`.
10. Open `platform-neighborhood-member-remove-{userId}` and confirm removal.

Expected:
- Neighborhood role assignment happens from the dialog and requires an existing user email.
- The members list only shows neighborhood admins.
- Edit and remove actions persist after refresh.

## Feature: Admin CRUD Coverage
### Test Run: Admin Edits Group
Preconditions:
- Admin logged in.
- Group exists.

Steps:
1. Go to /admin/groups/{groupId}/edit.
2. Change name or address.
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
