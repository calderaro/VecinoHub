# Group Invitations Implementation Plan

## 1. Executive Summary

This feature adds invite-based onboarding for group membership. Today, group membership management assumes the target person already has a VecinoHub account. The new flow must allow group managers to invite any email address, send an email notification with a dashboard deep link, and let the recipient accept or reject the invite from `/dashboard/invites`.

The implementation must follow the existing project rules:
- SSR-first for read-only pages
- all mutations through tRPC
- all validation, business logic, and DB access in services
- no direct DB access from pages or routers

## 2. Feature Goal

Enable a group admin, neighborhood admin, or platform admin to invite a person to a group by email, regardless of whether that person already has a VecinoHub account.

Expected product behavior:
- Managers invite by email from the group members screen.
- The system sends an email that links to `/dashboard/invites`.
- If the recipient is not signed in, auth redirects must preserve the target route.
- If the recipient is not registered, they register first, verify email, and then land on `/dashboard/invites`.
- The invite recipient explicitly accepts or rejects the invite.
- Group membership is created only when the recipient accepts.

## 3. Success Criteria

The feature is complete when all of the following are true:
- A manager can send an invite to any valid email address.
- The system stores a pending invite and sends an email successfully.
- Registered users see matching invites in `/dashboard/invites`.
- Unregistered users can register and then see the same invite in `/dashboard/invites`.
- Accepting an invite creates or reactivates:
  - a `neighborhood_memberships` row with role `neighbor`
  - a `group_memberships` row with the invited role
- Rejecting an invite creates no membership row.
- Managers can resend or cancel pending invites.
- A signed-in user cannot accept or reject an invite sent to a different email address.
- `/dashboard` handles the “no groups, but pending invites” state correctly.

## 4. Scope

### In Scope
- Group invite persistence
- Email delivery for invite notifications
- Invite acceptance and rejection
- Invite management from `/dashboard/[groupId]/members`
- Invite inbox at `/dashboard/invites`
- Auth redirect preservation for invite deep links
- QA and Playwright flow updates

### Out of Scope
- Bulk invites
- CSV import
- Invite reminder scheduler or background jobs
- Push notifications
- Invite analytics dashboard
- Email template editor
- Admin moderation workflow for accepted invites

## 5. Product Decisions

These are implementation-driving decisions and should be treated as the working spec.

### 5.1 Invite-first email entry
- Email entry in the group member management UI becomes invite-first.
- Typing an email must not immediately create a membership.
- Existing direct membership creation may remain available only through explicit internal/admin paths if needed later, but the primary dashboard email flow should create invites.

### 5.2 Same flow for existing and new users
- Existing users and not-yet-registered users use the same invite creation flow.
- The difference appears only at acceptance time:
  - existing user signs in and accepts
  - new user signs up, verifies email, then accepts

### 5.3 Invite ownership
- An invite belongs to exactly one email address and one group.
- Only a signed-in account with the same email address may respond.
- Email matching is case-insensitive.

### 5.4 Invite lifecycle
- Statuses: `pending`, `accepted`, `rejected`, `cancelled`, `expired`
- Default expiry: 14 days from the latest send
- Resend refreshes token and expiry
- One pending invite per `group + email`

### 5.5 Membership creation timing
- No `group_memberships` row is created when the invite is sent.
- Membership is created only on acceptance.
- If the recipient already has an inactive membership, acceptance reactivates it.

## 6. User Flows

### 6.1 Manager sends an invite
1. Manager opens `/dashboard/[groupId]/members`.
2. Manager clicks the invite action.
3. Manager enters:
   - recipient email
   - invited role (`group_member` or `group_admin`)
4. Client calls `groupInvites.create`.
5. Service validates permission, membership state, and deduplication rules.
6. DB writes the invite row.
7. Email is sent with a deep link to `/dashboard/invites?invite=<token>`.
8. UI refreshes and shows the invite in the pending invites section.

### 6.2 Existing user accepts
1. Recipient clicks the email link.
2. If already authenticated, they reach `/dashboard/invites`.
3. The page lists matching invites for their account email.
4. Recipient clicks accept.
5. Service validates:
   - invite is still actionable
   - account email matches invite email
   - group and neighborhood still exist and are consistent
6. Service upserts neighborhood membership and group membership.
7. Invite is marked `accepted`.
8. UI redirects to `/dashboard` or `/dashboard/[groupId]`.

### 6.3 Existing user rejects
1. Recipient signs in and opens `/dashboard/invites`.
2. Recipient clicks reject.
3. Service validates email match and pending state.
4. Invite is marked `rejected`.
5. No membership is created.

### 6.4 New user accepts after sign-up
1. Recipient clicks the email link.
2. App redirects to `/login?tab=signup&next=/dashboard/invites?invite=<token>` if not authenticated.
3. User creates account.
4. User verifies email OTP.
5. Auth flow redirects to `/dashboard/invites?invite=<token>`.
6. `/dashboard/invites` lists invites that match the now-verified user email.
7. User accepts or rejects.

### 6.5 Manager resends
1. Manager opens the pending invite list for a group.
2. Manager clicks resend.
3. Service validates manager scope and pending state.
4. Service rotates token, updates `last_sent_at`, extends expiry, and sends a new email.

### 6.6 Manager cancels
1. Manager opens the pending invite list for a group.
2. Manager clicks cancel.
3. Service validates manager scope.
4. Invite status becomes `cancelled`.
5. Invite disappears from actionable inbox sections.

## 7. Architecture and Ownership

### 7.1 Backend ownership
- `src/db/schema.ts`
  - add enum and table
- `src/services/group-invites.ts`
  - all invite validation, permissions, DB access, and mail delivery orchestration
- `src/server/trpc/routers/group-invites.ts`
  - thin router for invite mutations and optional client queries
- `src/server/better-auth.ts`
  - keep auth config, but extract reusable mail transport logic into shared code
- `src/server/mail.ts` or `src/server/mailer.ts`
  - shared SMTP transport and invite/auth email helpers

### 7.2 Frontend ownership
- `src/app/dashboard/invites/page.tsx`
  - SSR inbox page
- `src/components/groups/group-members.tsx`
  - replace email-add workflow with invite workflow
  - render pending invite management UI for authorized users
- `src/components/user-menu.tsx`
  - add invites navigation entry
- `src/app/dashboard/page.tsx`
  - redirect to invites when user has no groups but does have pending invites
- `src/components/auth/auth-combined-page.tsx`
  - preserve `next` redirect target across sign-in/sign-up/verification

### 7.3 Documentation ownership
- `docs/API.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

## 8. Data Model Design

### 8.1 New enum
- `group_invite_status`
  - `pending`
  - `accepted`
  - `rejected`
  - `cancelled`
  - `expired`

### 8.2 New table: `group_invites`

Recommended columns:
- `id uuid primary key default gen_random_uuid()`
- `group_id uuid not null`
- `neighborhood_id uuid not null`
- `email text not null`
- `role group_role not null default 'group_member'`
- `status group_invite_status not null default 'pending'`
- `token_hash text not null`
- `invited_by uuid not null`
- `responded_by uuid null`
- `last_sent_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `accepted_at timestamptz null`
- `rejected_at timestamptz null`
- `cancelled_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 8.3 Constraints
- Foreign keys:
  - `group_id -> groups.id`
  - `neighborhood_id -> neighborhoods.id`
  - `invited_by -> users.id`
  - `responded_by -> users.id`
- Unique pending invite per group/email
  - preferred: partial unique index on `(group_id, lower(email)) where status = 'pending'`
  - fallback: enforce in service if Drizzle partial unique support is awkward
- Unique token hash

### 8.4 Indexes
- `(group_id, status)`
- `lower(email), status`
- `(neighborhood_id, status)`
- `expires_at`

### 8.5 Normalization rules
- Email stored trimmed
- Service comparisons always use `lower(email)`
- `neighborhood_id` stored redundantly for faster scoped reads and stricter consistency checks

### 8.6 Migration plan
1. Update `src/db/schema.ts`
2. Run `npm run db:generate`
3. Review generated migration
4. Run `npm run db:migrate`
5. Verify schema on clean DB and seeded DB

## 9. Security Model

### 9.1 Core rules
- Invite response is tied to account email, not session id or token alone.
- The email link token is a locator, not authorization by itself.
- Acceptance/rejection requires an authenticated session.
- The signed-in user’s email must match the invite email case-insensitively.

### 9.2 Token handling
- Generate a random invite token for email links.
- Store only a hash in DB.
- Email link contains the raw token.
- Server compares hashed token for lookup when needed.

### 9.3 Expiry behavior
- No background worker is required.
- Services lazily transition expired actionable invites to `expired`.
- Expired invites cannot be accepted or rejected.

### 9.4 Wrong-account handling
- If a signed-in user opens an invite link for a different email:
  - do not expose actionable controls for that invite
  - show a safe message telling them the invite belongs to another email
  - allow sign-out and re-authentication

## 10. Service Layer Design

Create `src/services/group-invites.ts`.

### 10.1 Shared helper functions
- `normalizeInviteEmail(email: string): string`
- `buildInviteExpiryDate(now: Date): Date`
- `generateInviteToken(): string`
- `hashInviteToken(token: string): string`
- `markInviteExpiredIfNeeded(inviteId: string): Promise<void>`
- `ensureInviteEmailMatchesUser(ctx, invite)`
- `ensureInviteStillActionable(invite)`
- `ensureInviteGroupConsistency(invite)`

### 10.2 Read services

#### `listMyInvites(ctx)`
Responsibilities:
- fetch current user email from `users`
- lazily expire stale pending invites for that email if necessary
- return pending invites first
- optionally return recent non-pending history for UI context

Recommended return shape:
```ts
{
  pending: Array<{
    id: string;
    groupId: string;
    groupName: string;
    neighborhoodId: string;
    neighborhoodName: string;
    role: "group_member" | "group_admin";
    invitedByName: string | null;
    status: "pending";
    expiresAt: Date;
  }>;
  history: Array<...>;
}
```

#### `listGroupInvites(ctx, { groupId })`
Responsibilities:
- permission check with `requireGroupAdminOrAdmin`
- return group-scoped pending invites and recent history
- include inviter and responder info when available

#### `getInviteByTokenForSession(ctx, { token })`
Responsibilities:
- resolve hashed token
- find invite
- if the invite email matches session user email, return it for page highlighting
- if it does not match, return a non-actionable mismatch result

### 10.3 Write services

#### `createGroupInvite(ctx, { groupId, email, role })`
Validation:
- valid email
- valid group role
- actor is `group_admin`, `neighborhood_admin`, or `platform_admin`
- target is not already an active member of that group

Behavior:
- normalize email
- load group and neighborhood scope
- if pending invite already exists for same group/email:
  - rotate token hash
  - update role if allowed by product decision
  - update `last_sent_at`, `expires_at`, `updated_at`
  - resend email
- else:
  - insert a new row
  - send email

Failure handling:
- if email send fails, the mutation should fail visibly
- recommended approach: perform DB write in transaction, commit, attempt send, and if send fails, either:
  - delete/revert the invite row in a compensating transaction, or
  - keep the invite row but return a failure state and expose resend

Preferred MVP rule:
- keep the row and return an `INVALID` service error with clear message if delivery fails, so managers can retry with resend

#### `resendGroupInvite(ctx, { inviteId })`
Validation:
- actor can manage the invite’s group
- invite status is `pending`
- invite is not expired, or resend may revive it by moving it back to `pending`

Recommended behavior:
- if expired, resend revives the invite with new token and new expiry
- update `last_sent_at`, `expires_at`, `updated_at`
- send email

#### `cancelGroupInvite(ctx, { inviteId })`
Validation:
- actor can manage invite’s group
- invite is still actionable

Behavior:
- set `status = "cancelled"`
- set `cancelled_at`
- set `updated_at`

#### `acceptGroupInvite(ctx, { inviteId })`
Validation:
- invite is `pending`
- invite not expired
- session user email matches invite email
- group and neighborhood still exist

Behavior:
- transaction:
  - upsert `neighborhood_memberships` as `neighbor` / `active`
  - upsert `group_memberships` as invited role / `active`
  - update invite to `accepted`
  - set `responded_by`, `accepted_at`, `updated_at`

Idempotency:
- if user already has active membership, keep it active and still mark invite accepted

#### `rejectGroupInvite(ctx, { inviteId })`
Validation:
- invite is `pending`
- invite not expired
- email match required

Behavior:
- set `status = "rejected"`
- set `responded_by`, `rejected_at`, `updated_at`

## 11. tRPC Router Design

Create `src/server/trpc/routers/group-invites.ts`.

### 11.1 Procedures
- `groupInvites.listMine`
- `groupInvites.listForGroup`
- `groupInvites.create`
- `groupInvites.resend`
- `groupInvites.cancel`
- `groupInvites.accept`
- `groupInvites.reject`

### 11.2 Input shapes

#### `groupInvites.create`
```ts
{
  groupId: string;
  email: string;
  role?: "group_member" | "group_admin";
}
```

#### `groupInvites.listForGroup`
```ts
{
  groupId: string;
}
```

#### `groupInvites.resend`
```ts
{
  inviteId: string;
}
```

#### `groupInvites.cancel`
```ts
{
  inviteId: string;
}
```

#### `groupInvites.accept`
```ts
{
  inviteId: string;
}
```

#### `groupInvites.reject`
```ts
{
  inviteId: string;
}
```

### 11.3 Router requirements
- input validation in services, not duplicated business logic in router
- use `getServiceContext`
- use `handleServiceError`
- keep router thin and consistent with existing style

## 12. Email Delivery Design

### 12.1 Mailer refactor

Current auth mail logic is embedded in `src/server/better-auth.ts`. This feature is a good point to extract a shared mail utility.

Recommended new file:
- `src/server/mail.ts`

Responsibilities:
- create or reuse SMTP transporter
- expose `sendInviteEmail`
- expose auth email helpers or shared `sendMail` primitive

### 12.2 Invite email content

Required content:
- subject that clearly communicates group invitation
- inviter name
- group name
- neighborhood name
- invited role
- expiry date
- primary CTA pointing to `/dashboard/invites?invite=<token>`
- fallback plain-text URL

### 12.3 Localization
- MVP can send a single default language email if needed
- better implementation: choose language in this order
  1. inviter preferred language, if business wants neighborhood-localized invites
  2. default app language (`es`) if no recipient account exists
  3. recipient preferred language if the recipient already has an account

Recommended MVP choice:
- send Spanish if no known recipient account exists
- use recipient preferred language when account already exists

## 13. SSR Page and UI Design

## 13.1 `/dashboard/invites`

Create:
- `src/app/dashboard/invites/page.tsx`

Page behavior:
- requires session
- fetches invite inbox via service directly on server
- uses dashboard header, even without selected group
- supports optional `searchParams.invite`
- if `invite` token maps to a mismatched email, show a non-destructive warning

Suggested sections:
- page header
- pending invites list
- optional invite history
- empty state

Suggested actions:
- accept button
- reject button
- “go to dashboard” CTA after acceptance if the user now has groups

### 13.2 `/dashboard`

Update `src/app/dashboard/page.tsx`.

Behavior:
- if user has groups, keep existing selector behavior
- if user has zero groups and pending invites > 0, redirect to `/dashboard/invites`
- else show current waiting state

### 13.3 `/dashboard/[groupId]/members`

Update `src/components/groups/group-members.tsx`.

Required changes:
- rename add-member dialog intent to invite-member
- use `groupInvites.create` for email submission
- show pending invite list when `canManage`
- add resend and cancel actions
- preserve accepted member role management and member removal

### 13.4 `UserMenu`

Update `src/components/user-menu.tsx`.

Add:
- `Invites` menu item
- optional pending count badge if count is passed down from server

Recommended MVP:
- add the menu link first
- badge can be follow-up if the extra server wiring is noisy

## 14. Auth Redirect Preservation

### 14.1 Problem
Current auth flows push to `/dashboard` directly. Invite deep links require preserving the destination path across:
- password sign-in
- sign-up
- email verification
- social sign-in
- magic-link sign-in

### 14.2 Solution

Add a safe `next` query param.

Rules:
- accept only internal relative paths
- reject absolute URLs or external domains
- default fallback remains `/dashboard`

Suggested helper:
- `sanitizeNextPath(next: string | null | undefined): string`

Update:
- `src/components/auth/auth-combined-page.tsx`
- any other auth-related redirect points that assume `/dashboard`

Required flows:
- sign in -> `router.push(next)`
- sign up completion -> `openEmailVerification` retains `next`
- email verification success -> `router.push(next)`
- magic link -> `callbackURL: next`
- social sign in -> `callbackURL: next`

## 15. Permissions and Guards

### 15.1 Allowed actors
- `group_admin`
  - create/resend/cancel invites for their own groups
- `neighborhood_admin`
  - create/resend/cancel invites for groups in authorized neighborhoods
- `platform_admin`
  - create/resend/cancel invites globally
- invite recipient
  - list own invites
  - accept or reject own invites

### 15.2 Disallowed actions
- group members cannot create or manage invites
- managers cannot accept/reject on behalf of recipients
- any user signed in with a different email cannot respond to the invite

### 15.3 Existing guards to reuse
- `requireGroupAdminOrAdmin`
- `resolveGroupAccess`
- `requireNeighborhoodMember`
- `requireNeighborhoodAdminOrPlatform`

### 15.4 New checks to add
- `requireInviteRecipientEmailMatch`
- `requireManageableGroupInvite`
- `ensurePendingInviteState`

## 16. Validation Rules

### 16.1 Create invite
- email is syntactically valid
- email is normalized
- role is valid
- group exists
- actor can manage group
- no active group membership for same email-backed account if account already exists
- no duplicate pending invite for same group/email unless treated as resend

### 16.2 Accept invite
- invite exists
- invite is pending
- invite not expired
- session exists
- session user email matches invite email

### 16.3 Reject invite
- same rules as accept, minus membership upsert

### 16.4 Resend/cancel
- invite exists
- actor can manage invite’s group
- status is actionable

## 17. Error Handling and UX Copy

Services should throw `ServiceError` with project-standard codes.

Recommended user-visible cases:
- `INVALID`
  - “This invite has expired.”
  - “This user is already an active member of the group.”
  - “We could not send the invite email. Try again.”
- `FORBIDDEN`
  - “You cannot manage invites for this group.”
  - “This invite was sent to a different email address.”
- `NOT_FOUND`
  - “Invite not found.”
  - “Group not found.”

## 18. Test IDs

Add stable test ids for all new UI.

Recommended ids:
- `dashboard-invites-root`
- `dashboard-invites-empty`
- `dashboard-invite-row-{inviteId}`
- `dashboard-invite-accept-{inviteId}`
- `dashboard-invite-reject-{inviteId}`
- `group-invites-list`
- `group-invite-row-{inviteId}`
- `group-invite-resend-{inviteId}`
- `group-invite-cancel-{inviteId}`
- `group-members-add-email`
- `group-members-add-role`
- `group-members-add-submit`
- `user-menu-invites`

## 19. Translation Work

Update:
- `src/messages/en.json`
- `src/messages/es.json`

Add namespaces/keys for:
- invites inbox page
- pending invite row labels
- invite status chips
- create invite dialog
- resend/cancel confirmations
- wrong-email warning
- email delivery error states
- user menu invites label

## 20. Implementation Phases

## Phase 1: Schema and mail foundation

Deliverables:
- enum + `group_invites` table in `src/db/schema.ts`
- generated migration
- shared mailer utility extracted from auth mail code

Tasks:
1. Add enum and table definitions.
2. Add indexes and constraints.
3. Generate and review migration.
4. Extract SMTP transport helpers into shared server mail file.
5. Make auth emails consume the shared mail helper if practical.

Exit criteria:
- migration applies cleanly
- auth emails still work
- shared mail helper can send invite emails

## Phase 2: Service layer

Deliverables:
- `src/services/group-invites.ts`

Tasks:
1. Implement email normalization and token helpers.
2. Implement create/list/resend/cancel/accept/reject services.
3. Reuse existing membership helpers where appropriate.
4. Add lazy-expiry logic.
5. Add strict email-match checks.

Exit criteria:
- service methods satisfy all core flows in isolation
- no permission logic is leaking into routers/pages

## Phase 3: tRPC router

Deliverables:
- `src/server/trpc/routers/group-invites.ts`
- router wiring into root router

Tasks:
1. Add query/mutation procedures.
2. Wire inputs.
3. Route errors through `handleServiceError`.

Exit criteria:
- invite mutations callable from client components

## Phase 4: Invite inbox

Deliverables:
- `/dashboard/invites`

Tasks:
1. Add SSR page.
2. Add client controls for accept/reject.
3. Handle empty state, mismatch state, and post-accept redirect.
4. Add `UserMenu` invites entry.

Exit criteria:
- signed-in user can manage own invites from the dashboard

## Phase 5: Group member management UI

Deliverables:
- updated `/dashboard/[groupId]/members`

Tasks:
1. Replace email-add mutation with invite creation mutation.
2. Add pending invites section.
3. Add resend/cancel actions.
4. Keep existing member role management intact.

Exit criteria:
- group managers can fully manage invite lifecycle from the members page

## Phase 6: Auth redirect preservation

Deliverables:
- safe `next` handling in auth flows

Tasks:
1. Read `next` from search params.
2. Sanitize internal paths.
3. Apply to sign-in/sign-up/OTP verification/magic link/social callbacks.

Exit criteria:
- invite deep links survive auth end to end

## Phase 7: QA and docs completion

Deliverables:
- translations
- QA docs
- Playwright docs
- manual verification

Tasks:
1. Add English and Spanish copy.
2. Validate test ids.
3. Run lint/build if implementation work is done.
4. Execute manual flows from QA docs.
5. Update `docs/PLAYWRIGHT_TEST_RUNS.md` if selectors or steps changed during implementation.

Exit criteria:
- feature is documented, translated, and manually verified

## 21. QA Strategy

### 21.1 Manual flows
- manager invites existing user
- existing user accepts
- existing user rejects
- manager invites non-registered email
- new user signs up from invite and accepts
- wrong-account sign-in cannot respond
- manager resends pending invite
- manager cancels pending invite
- expired invite cannot be accepted
- `/dashboard` redirects correctly when no groups but pending invites exist

### 21.2 Regression areas
- auth redirects
- email verification
- group members page
- dashboard root empty state
- user menu navigation
- existing add/remove member flows for already accepted members

### 21.3 Recommended automated tests when feasible
- service tests for:
  - duplicate pending invite behavior
  - accept creates memberships
  - reject creates no memberships
  - wrong-email user cannot accept
  - resend rotates expiry/token
- Playwright/manual coverage for auth and dashboard flows

## 22. Rollout and Release Checklist

Before release:
1. SMTP is configured in the target environment.
2. Migration is applied.
3. Invite emails are verified in staging.
4. Auth redirect behavior is verified for password and OTP flows.
5. English and Spanish UI copy is complete.
6. QA checklist is executed.
7. Playwright/manual run notes are updated.

After release:
1. Monitor invite email failures.
2. Monitor acceptance/rejection behavior in logs.
3. Verify no spike in auth redirect issues.

## 23. Risks and Mitigations

### Risk: mail send fails after invite row is created
Mitigation:
- surface a clear error
- keep resend available
- log delivery failure with invite id and group id

### Risk: wrong user signs in after clicking invite link
Mitigation:
- enforce email match on the server
- show non-actionable mismatch state

### Risk: direct add and invite flow diverge
Mitigation:
- make dashboard email entry invite-first
- keep any direct-add logic clearly separate if retained

### Risk: expired invites remain visible as pending
Mitigation:
- lazy expiry updates in read and write services

### Risk: duplicated pending invites
Mitigation:
- unique pending invite rule
- resend behavior updates existing row instead of inserting a new one

## 24. Acceptance Checklist

The feature can be called done when:
- schema is migrated
- invite emails are sent successfully
- `/dashboard/invites` works for users with zero groups
- auth preserves invite deep links
- acceptance creates correct memberships
- rejection does not create memberships
- managers can resend and cancel
- wrong-email accounts cannot respond
- docs and QA artifacts are updated

## 25. Recommended Build Order

If implementation starts immediately, use this sequence:
1. Schema and migration
2. Shared mailer extraction
3. Invite service
4. tRPC router
5. `/dashboard/invites`
6. `/dashboard` redirect behavior
7. group members invite UI
8. auth `next` preservation
9. translations and QA

This order minimizes rework and keeps the auth-sensitive path late enough that the core invite model is already stable.
