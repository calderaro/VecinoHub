# Security Best Practices Report

Date: 2026-03-10
Repository: VecinoHub
Auditor: Codex

## Executive Summary

This review focused on the current TypeScript/Next.js/tRPC/Better Auth codebase, with emphasis on server-side authorization, sensitive-data exposure, session/context handling, and baseline web hardening.

I did not find a currently exploitable critical or high-severity bug in the reviewed code paths. The main issues are medium and low severity:

1. The resident fundraising read path returns more contribution data than the UI should expose and relies on page-level filtering for least privilege.
2. Any active group member can view other members' email addresses and system roles.
3. Email-based membership flows allow account enumeration by low-privileged admins.
4. Admin neighborhood context is derived from client-controlled request metadata.
5. No application-level security header posture is visible in repo code.

This was a source review only. I did not perform runtime penetration testing, browser exploitation, infrastructure inspection, or cloud/edge configuration review.

## Findings

### VH-SEC-001

- Severity: Medium
- Location:
  - `src/services/fundraising.ts:714-735`
  - `src/app/dashboard/[groupId]/fundraising/[campaignId]/page.tsx:36-40`
- Evidence:
  - The resident branch of `getCampaignDetail()` first authorizes neighborhood membership, then loads **all** contribution rows for every active group the user belongs to in that neighborhood:
    - `src/services/fundraising.ts:725-733`
  - The dashboard page then hides non-self rows only in page logic:
    - `src/app/dashboard/[groupId]/fundraising/[campaignId]/page.tsx:39-40`
- Impact:
  - Sensitive fundraising fields are over-fetched for residents, including submitter IDs and wire-transfer fields, before the UI narrows the result.
  - Today the exposed page filters to the current submitter, but the service itself is not least-privilege. Reuse of this service in another page, API, or logging path would leak other members' contribution data for the same group/neighborhood.
- Fix:
  - Split the service into explicit admin and resident read paths.
  - For resident reads, filter in SQL to the intended visibility boundary before returning data. If residents should only see their own submissions, add `eq(fundraisingContributions.submittedBy, ctx.user.id)` in the service layer.
  - Avoid returning wire-transfer fields to resident-facing callers unless explicitly required.
- Mitigation:
  - Add a DTO layer that strips sensitive fields before values leave the service layer.
- False positive notes:
  - The current dashboard page does apply an additional filter before rendering. The risk is the service contract, not a confirmed leak on that exact page today.

### VH-SEC-002

- Severity: Medium
- Location:
  - `src/services/groups.ts:128-182`
  - `src/services/groups.ts:660-682`
  - `src/app/dashboard/[groupId]/members/page.tsx:21-28`
  - `src/components/groups/group-members.tsx:113-141`
- Evidence:
  - `getViewerGroupAccess()` allows any active group member to pass the access check:
    - `src/services/groups.ts:174-181`
  - `listGroupMembers()` then returns each member's `email`, `systemRole`, and `userStatus`:
    - `src/services/groups.ts:668-679`
  - The dashboard members page calls that endpoint for all group members:
    - `src/app/dashboard/[groupId]/members/page.tsx:21-28`
  - The client component renders the secondary line as the user's email when no username is set:
    - `src/components/groups/group-members.tsx:115-141`
- Impact:
  - Any resident with ordinary group membership can enumerate other members' email addresses and identify platform admins or inactive accounts in the same group.
  - This is unnecessary PII and privilege metadata exposure for a low-privilege role.
- Fix:
  - Restrict full roster details to group admins and neighborhood admins.
  - For ordinary group members, return a reduced shape such as display name, avatar, and group role only.
  - Remove `users.role` and `users.status` from the low-privilege read path unless there is a clear product requirement.
- Mitigation:
  - If email visibility is required, make it opt-in and document it in the product/privacy posture.
- False positive notes:
  - If the product explicitly intends all group members to share direct contact details, this becomes a privacy-design decision rather than an implementation bug. That intent is not documented in the permission model I reviewed.

### VH-SEC-003

- Severity: Low
- Location:
  - `src/services/groups.ts:371-380`
  - `src/services/neighborhoods.ts:359-375`
- Evidence:
  - Group admins can add members by email. The code performs a direct user lookup and throws `User not found` when the address is absent:
    - `src/services/groups.ts:371-380`
  - Neighborhood admins have the same behavior:
    - `src/services/neighborhoods.ts:359-375`
- Impact:
  - Low-privileged admins can test arbitrary email addresses and learn whether an account exists on the platform.
  - This supports targeted phishing and account discovery.
- Fix:
  - Replace direct account lookup flows with invitation flows.
  - If immediate add-by-email must remain, return a generic success/error message regardless of whether the user exists, and enqueue an invitation or review flow instead of confirming account existence.
- Mitigation:
  - Log repeated failed lookups and rate-limit the mutation endpoints.
- False positive notes:
  - This is not public enumeration; it requires group-admin or neighborhood-admin privileges. The issue is still relevant because those roles can be widely distributed in community software.

### VH-SEC-004

- Severity: Low
- Location:
  - `src/server/auth.ts:24-35`
  - `src/services/guards.ts:115-137`
  - `src/server/trpc/routers/neighborhoods.ts:196-200`
  - `src/services/groups.ts:189-205`
- Evidence:
  - `getSession()` derives `activeNeighborhoodId` from the raw `Referer` header and then falls back to a writable cookie:
    - `src/server/auth.ts:24-35`
  - For platform admins, `listNeighborhoodAdminIdsForUser()` trusts that active context directly:
    - `src/services/guards.ts:115-137`
  - The active-context cookie is set without `httpOnly` or `secure`:
    - `src/server/trpc/routers/neighborhoods.ts:196-200`
  - Create flows such as `createGroup()` use the active context when `neighborhoodId` is omitted:
    - `src/services/groups.ts:189-205`
- Impact:
  - Administrative scope can be influenced by client-controlled metadata rather than only by an explicit, server-validated selection.
  - This is primarily a confused-context risk: wrong-neighborhood reads or writes become easier if another bug, browser automation path, or same-origin script manipulates the request metadata.
- Fix:
  - Stop deriving admin scope from `Referer`.
  - Treat neighborhood context as an explicit server-side selection only, backed by a validated cookie or mutation input.
  - Mark the context cookie `httpOnly`, and set `secure` in production.
- Mitigation:
  - Continue validating final neighborhood authorization in services, even when a trusted context mechanism is introduced.
- False positive notes:
  - I did not confirm a standalone remote exploit path from this issue alone. The current code still re-checks many final permissions. The concern is the trust boundary and attack surface expansion.

### VH-SEC-005

- Severity: Low
- Location:
  - `next.config.ts:4-6`
- Evidence:
  - The visible Next.js config is empty and there is no app-level security header configuration in the reviewed repo code:
    - `next.config.ts:4-6`
- Impact:
  - If the deployment edge is not injecting headers, the app lacks an in-code baseline for CSP, clickjacking defense, `X-Content-Type-Options`, and a referrer policy.
  - That weakens browser-enforced defense in depth against XSS and UI redress attacks.
- Fix:
  - Add a baseline header policy in app or edge config, at minimum:
    - `Content-Security-Policy`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy`
    - clickjacking protection via CSP `frame-ancestors` and/or `X-Frame-Options`
- Mitigation:
  - Verify production response headers before treating this as closed; app code alone does not show whether a CDN or reverse proxy is handling it.
- False positive notes:
  - This may already be enforced at the CDN, proxy, or hosting layer. I could not verify that from repository code.

## Additional Observations

- `npm audit --json` on 2026-03-10 did not report any current high or critical production dependency advisories in this checkout.
- The audit did report 5 moderate issues in the dev toolchain, all tied to `drizzle-kit` and an older `esbuild` chain. Those are lower priority than the application issues above but should still be patched during dependency maintenance.

## Recommended Remediation Order

1. Narrow `getCampaignDetail()` to least-privilege resident data.
2. Reduce member roster exposure for ordinary group members.
3. Replace or harden email-based membership lookup flows.
4. Remove `Referer` as an authorization/context input and harden the context cookie.
5. Confirm and document production security headers.

## Scope Limitations

- No runtime header capture or browser exploit testing
- No infra/CDN/WAF/reverse-proxy review
- No cloud IAM, database network, or secret-manager review
- No mobile/native client review
