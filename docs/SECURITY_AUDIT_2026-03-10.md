# Security Audit Report

Date: 2026-03-10
Repository: VecinoHub
Auditor: Codex

## Scope

This pass focused on:

- Authentication and session handling
- Authorization and neighborhood/group scoping
- Sensitive data handling and logging
- Dependency exposure from the current lockfile install

This was a code audit of the repository. It did not include infrastructure, deployment configuration, production headers, TLS, cloud IAM, database network posture, or runtime penetration testing.

## Method

- Reviewed auth and session code in `src/server/better-auth.ts` and `src/server/auth.ts`
- Reviewed service-layer authorization in `src/services/*`
- Checked for direct DB access outside the service layer
- Ran targeted searches for sensitive logging and auth-related patterns
- Ran `npm audit --json`

## Executive Summary

The codebase has a decent baseline:

- Passwords are not stored in plaintext. Better Auth hashes them with salted `scrypt` before persistence.
- Most business logic and authorization checks are centralized in the service layer.
- I did not find direct DB access from pages or tRPC routers outside the service layer.

The main risks found are:

1. A campaign detail read path allows unauthorized campaign metadata access and may rely on inactive memberships.
2. Poll voting does not verify that the submitted option belongs to the target poll.
3. Auth fallback behavior logs live authentication secrets when SMTP is not configured.
4. Auth rate limiting is disabled.
5. The installed dependency set includes known advisories, including high-severity issues in `next` and `minimatch`.
6. Local seed credentials are committed in plaintext in code and docs.

## Findings

### 1. High: Campaign detail endpoint has an IDOR and incomplete membership enforcement

Affected code:

- `src/services/fundraising.ts:605-709`
- `src/services/fundraising.ts:688-709`

Evidence:

- `getCampaignDetail()` loads the campaign by ID before proving the caller belongs to the campaign's neighborhood.
- For non-admin users, it falls back to all group memberships for the current user with:
  - `where(eq(groupMemberships.userId, ctx.user.id))`
- That query does not require:
  - active group membership
  - active neighborhood membership
  - membership in the campaign's neighborhood
- The function then returns `campaign` unconditionally, even if the user has no valid relationship to that neighborhood, and only filters the returned contributions by the user's `groupIds`.

Impact:

- Any authenticated user with any group membership can fetch metadata for arbitrary campaigns by ID outside their authorized neighborhoods.
- Former members may continue to receive contribution visibility tied to inactive memberships.
- This violates the documented rule in `docs/PERMISSIONS.md` that all domain reads are neighborhood-scoped and server-validated.

Recommended fix:

- Before returning campaign data, require one of:
  - platform admin
  - active neighborhood admin membership in the campaign neighborhood
  - active neighborhood membership in the campaign neighborhood plus active group membership in that same neighborhood
- For the resident path, scope membership lookup with both:
  - `groupMemberships.status = 'active'`
  - `groups.neighborhoodId = campaign.neighborhoodId`
- If the caller has no authorized relationship to the campaign neighborhood, return `NOT_FOUND` or `FORBIDDEN` before returning campaign metadata.

### 2. High: Poll voting accepts option IDs from other polls

Affected code:

- `src/services/polls.ts:374-427`

Evidence:

- `voteInPoll()` validates:
  - group membership
  - poll existence
  - poll status
  - neighborhood consistency between poll and group
- It does not validate that `optionId` belongs to `pollId` before insert/update.
- The vote is persisted directly with the caller-supplied `optionId`.

Impact:

- A group can cast or update a vote using an option from a different poll.
- That can corrupt poll integrity and effectively consume the group's one-vote slot with an invalid selection.
- The effect is a data integrity and business-logic bypass in a core governance workflow.

Recommended fix:

- Load the option record before writing the vote.
- Reject the request unless `pollOptions.pollId === pollId`.
- Consider a database-level foreign key strategy or compound validation to prevent cross-poll option references.

### 3. Medium: Auth fallback logs live OTPs, magic links, and password reset links

Affected code:

- `src/server/better-auth.ts:117-126`
- `src/server/better-auth.ts:147-156`
- `src/server/better-auth.ts:185-194`

Evidence:

- When SMTP is absent, the server logs:
  - magic-link URLs
  - password-reset URLs
  - email OTP values

Impact:

- Anyone with access to application logs can authenticate as users, reset passwords, or complete verification/sign-in flows.
- In shared staging, CI, PaaS logs, or support environments, this is equivalent to leaking authentication secrets.

Recommended fix:

- Do not log live auth secrets.
- In development, prefer one of:
  - a local mail catcher
  - an explicit dev-only outbox table/view
  - masked logs that never contain the token or OTP itself
- Gate any debug behavior behind a dedicated development-only environment flag.

### 4. Medium: Login and auth flows have rate limiting explicitly disabled

Affected code:

- `src/server/better-auth.ts:227`

Evidence:

- Better Auth is configured with `rateLimit: { enabled: false }`.

Impact:

- Password, OTP, and magic-link flows are more exposed to brute force, credential stuffing, and abuse.
- This materially weakens the protection of otherwise hashed passwords.

Recommended fix:

- Enable Better Auth rate limiting.
- Add IP and account-based throttling for:
  - password sign-in
  - OTP send/verify
  - password reset requests
  - magic-link sends
- Add operational alerting around repeated auth failures.

### 5. Medium: Current dependency set includes known advisories

Affected code:

- `package.json:25`
- `package.json:42`

Evidence:

- `npm audit --json` on 2026-03-10 reported:
  - `next@16.1.4` with high/moderate advisories and a fix available in `16.1.6`
  - `minimatch` high-severity ReDoS advisories
  - `drizzle-kit` and related `esbuild` advisory chain

Impact:

- At least some exposure is runtime-relevant because `next` is a direct production dependency.
- The exact exploitability depends on deployment and feature usage, but the repo is currently behind known patched versions.

Recommended fix:

- Upgrade `next` to `16.1.6` or newer first.
- Re-run `npm audit` after updating the lockfile.
- Review whether the `drizzle-kit` advisory chain is dev-only in your deployment model and patch it on the next dependency maintenance cycle.

### 6. Low: Seed credentials are committed in plaintext in source and documentation

Affected code:

- `scripts/seed.ts:29-50`
- `docs/SEEDING.md:4-9`

Evidence:

- Static local credentials are defined and documented directly in the repo.

Impact:

- This is acceptable for disposable local development data only.
- It becomes risky if the same credentials are reused in shared environments or if the repo is mistaken for containing non-public credentials.

Recommended fix:

- Keep these accounts local-only and never reuse them in hosted environments.
- Consider moving seeded passwords to environment-driven values for non-local runs.
- Mark them explicitly as development-only in docs.

## Additional Observations

- Password storage itself is acceptable. Better Auth hashes passwords before persistence using salted `scrypt`.
- Session tokens and OAuth tokens are stored as plaintext database fields in `src/db/schema.ts`. That is not uncommon, but it means database read access is enough for session replay or third-party token reuse. If your threat model includes database read exposure, consider hardening this with encryption at rest and tighter operational controls.
- I did not find service-layer bypasses from pages or tRPC routers; the overall architectural direction is sound.

## Recommended Remediation Order

1. Fix `getCampaignDetail()` authorization and membership scoping.
2. Fix `voteInPoll()` to validate `optionId` ownership.
3. Remove auth-secret logging fallbacks.
4. Re-enable and tune auth rate limiting.
5. Upgrade `next` and re-run dependency audit.
6. Clean up seed credential handling and documentation.

## Suggested Follow-Up Work

- Add authorization regression tests for:
  - cross-neighborhood campaign reads
  - inactive-member fundraising access
  - invalid poll option voting
- Add negative tests for every `getById` read path across neighborhood-scoped resources.
- Add a short security checklist to PR review for auth, scoping, and sensitive logging changes.

## Addendum: 2026-03-10 Remediation Follow-Up

The following additional audit findings were verified and remediated after the initial report:

- `users.status` is now enforced as an actual access-control field:
  - session creation is blocked for inactive users
  - inactive users are treated as unauthenticated when reading the current session
  - deactivating a user revokes existing sessions from the local `sessions` table
- Neighborhood membership loss now revokes effective group access in that neighborhood:
  - stale `group_admin` memberships no longer grant manage access without active neighborhood membership
  - stale group memberships no longer grant group detail/member-list read access without active neighborhood membership
  - removing or inactivating a neighborhood membership cascades group memberships in that neighborhood to `inactive`
  - re-adding neighborhood membership does not silently restore prior group memberships

Regression coverage was added for both areas in the Vitest suite.

## Addendum: 2026-03-10 Token Storage Remediation

The auth storage model was further hardened after the earlier follow-ups:

- Better Auth sessions now use Redis-backed `secondaryStorage` instead of relying on plaintext session tokens in the SQL `sessions` table.
- SQL session persistence is disabled in Better Auth config, so database session rows are no longer authoritative for active login state.
- User deactivation now revokes Redis-backed sessions as well as any legacy SQL session rows.
- OAuth account tokens are now encrypted at rest through Better Auth's `account.encryptOAuthTokens` option.

This closes the previously noted residual concern that database read access would expose live session tokens and third-party OAuth tokens in plaintext.
