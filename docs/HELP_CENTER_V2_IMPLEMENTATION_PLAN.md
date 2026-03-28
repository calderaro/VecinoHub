# Help Center V2 Implementation Plan

## Implementation Status
- Status: implemented on 2026-03-28
- Milestone 1: completed
- Milestone 2: completed
- Milestone 3: completed
- Milestone 4: completed
- Milestone 5: completed

## Summary
This plan upgrades the current in-app Help Center from a static documentation surface into a guided product-assistance system. The objective is to reduce user confusion, shorten time-to-success on high-friction flows, and give the product team measurable evidence about where documentation is helping or failing.

This version prioritizes:
- better contextual guidance
- stronger role-aware relevance
- measurable search and article usage
- structured feedback loops
- a content model that can later move to a CMS without rewriting the UI

This plan assumes the current V1 already exists:
- `/help`
- `/help/[slug]`
- contextual help panels on key screens
- code-based article registry in `src/lib/help-content.ts`

## Product Goals
- Reduce friction in the top support-heavy flows:
  - joining a group
  - invites vs access requests
  - managing members and roles
  - reading funds and submitting payments
  - reserving shared resources
- Improve the relevance of help content based on user role and current screen.
- Make the help system measurable so the team can identify content gaps.
- Establish a durable content structure that supports future editorial scale.

## Non-Goals
- No CMS in this phase.
- No AI assistant or chatbot in this phase.
- No full walkthrough engine or product tours in this phase.
- No screenshot-heavy documentation library in this phase.
- No platform-admin-specific documentation track in this phase unless needed later.

## Success Criteria
- Users can discover the right help article from the current screen in 1 click.
- `/help` shows recommendations that feel relevant to the user’s role and situation.
- Search covers article title, summary, body, and curated keywords.
- The team can measure:
  - article opens
  - contextual panel opens
  - search usage
  - searches with zero results
  - click-through from help into product actions
  - article helpfulness responses
- Top-priority screens expose contextual help that is visibly more actionable than V1.

## Locked Scope for V2

### In scope
- Role-aware recommendations in the help center
- Better contextual surfacing on priority screens
- Expanded content model with keywords and task metadata
- Search improvements using local in-code indexing rules
- “Was this helpful?” feedback on article detail pages
- Basic analytics hooks for help interactions
- Better article structure for operational tasks
- Improved deep links from help into product flows
- Documentation and QA updates

### Out of scope
- Admin UI for editing help content
- Database persistence for articles
- Full multilingual article library
- Rich media management
- Search backend service
- User-generated comments on articles

## Workstream 1: Content Model and API Expansion

### Goal
Extend the current help content registry so recommendations, search, analytics, and future migration paths are first-class.

### Changes
- Expand `HelpArticle` to include:
  - `keywords: string[]`
  - `priority: number`
  - `roles: Array<"resident" | "group_admin" | "neighborhood_admin" | "shared">`
  - `journey: "access" | "members" | "funds" | "resources" | "community" | "account"`
  - `ctaLinks: Array<{ label: string; href: string; intent: string }>`
  - `supportSignals?: string[]` for phrases users might search
  - `published: boolean`
- Expand contextual entry model to include:
  - `priority`
  - `roles`
  - `triggerIntent`
- Add internal selectors:
  - `listFeaturedHelpArticles({ locale, role, screenKey? })`
  - `searchHelpArticles({ locale, query, role })`
  - `listRelatedHelpArticles({ locale, slug, role })`
  - `listContextHelpByScreen({ locale, screenKey, role })`
- Keep content in code, but isolate data from view logic so a future CMS adapter can replace the source without changing the UI layer.

### Acceptance
- The help content layer supports recommendations and search without screen components implementing their own filtering logic.
- All article resolution happens through the central help module.

## Workstream 2: Role-Aware Help Center Home

### Goal
Make `/help` feel personalized and task-oriented rather than like a flat list.

### Changes
- Replace the current static featured section with role-aware recommendations:
  - resident default set
  - admin default set
  - shared content only when relevant
- Add a “Recommended for you” section driven by:
  - role
  - current access level
  - optionally the user’s last active context if cheap to derive
- Add a “Most used tasks” or “Start here” block:
  - residents:
    - join a group
    - check invites
    - pay funds
    - reserve a resource
  - admins:
    - manage members
    - review access requests
    - manage funds
    - manage resources
- Keep “All articles” below the personalized blocks.
- Preserve the Spanish-only notice when locale is English.

### Acceptance
- Resident and admin accounts do not see the same featured set.
- The top of `/help` communicates task-based entry points, not just content browsing.

## Workstream 3: Search Improvement

### Goal
Make help search usable for real user intent, not just exact title matching.

### Changes
- Replace current search matching with weighted local matching against:
  - title
  - summary
  - category
  - keywords
  - body text
  - supportSignals
- Use a simple ranking model in code:
  - title exact/prefix > keyword match > summary/body match
- Add empty-state guidance:
  - suggest related top tasks
  - show fallback articles if no results
- Track zero-result searches for content-gap analysis.
- Do not introduce external search infrastructure in this phase.

### Acceptance
- Queries like `unirme`, `invitación`, `solicitud`, `reservar salón`, `pagar mantenimiento`, `rol admin` return sensible results.
- Zero-result states are no longer dead ends.

## Workstream 4: Contextual Help V2

### Goal
Make contextual help more useful and more targeted to the exact screen and user.

### Changes
- Keep the current panel pattern, but improve the payload shown per screen.
- Prioritized screens:
  - `/dashboard/request-access`
  - `/dashboard/invites`
  - `/dashboard/[groupId]/members`
  - `/dashboard/[groupId]/fund`
  - `/dashboard/[groupId]/resources`
  - `/admin/[neighborhoodId]/fund`
  - `/admin/[neighborhoodId]/resources`
- For each screen, contextual help should include:
  - purpose of the screen
  - who should use it
  - top tasks
  - what to verify before acting
  - what happens after each important action
  - direct CTA into the most relevant article
  - direct CTA into the next product action where appropriate
- Add optional inline “Quick answer” cards above the panel trigger on the two highest-friction screens:
  - `request-access`
  - `members`
- Do not add help triggers to every route; stay focused on high-friction flows.

### Acceptance
- Contextual help is visibly different by screen and by admin/resident role where applicable.
- At least the two highest-friction screens provide stronger guidance than the generic V1 pattern.

## Workstream 5: Article Detail Quality Upgrade

### Goal
Turn articles into operational guides that can actually resolve support questions.

### Changes
- Standardize article detail layout with these sections:
  - Qué es
  - Quién lo usa
  - Antes de empezar
  - Cómo hacerlo
  - Qué pasa después
  - Errores o dudas frecuentes
  - Enlaces útiles
- Add “Quick checklist” block where relevant.
- Add “Related articles” ranking using shared category + journey + keywords, not category alone.
- Improve deep links so articles point to the exact best next action.
- Keep copy in Spanish for now.

### Acceptance
- All priority articles follow one consistent structure.
- Related article suggestions are meaningfully connected, not just category neighbors.

## Workstream 6: Helpfulness Feedback

### Goal
Create a lightweight feedback loop for continuous content improvement.

### Changes
- Add “¿Te ayudó este artículo?” to `/help/[slug]`
- Response options:
  - Sí
  - No
- If `No`, show optional short free-text field with submit button.
- Store feedback initially through an internal event/logging path only if app infra is already available.
- If persistent storage is not yet available, at minimum emit structured analytics events with:
  - article slug
  - answer
  - optional comment length / presence
- No public display of feedback.

### Acceptance
- Users can submit yes/no feedback without leaving the page.
- Negative feedback is distinguishable from non-response in analytics.

## Workstream 7: Analytics and Measurement

### Goal
Make help usage observable and actionable.

### Events to track
- `help_center_opened`
- `help_search_used`
- `help_search_zero_results`
- `help_article_opened`
- `help_article_cta_clicked`
- `help_context_opened`
- `help_context_article_clicked`
- `help_feedback_submitted`

### Event payload minimums
- `userRole`
- `locale`
- `screenKey` when available
- `articleSlug` when available
- `queryLength` and normalized query presence for search
- `resultCount` for search
- `source`:
  - menu
  - context_panel
  - related_article
  - featured
  - search

### Acceptance
- Product can answer:
  - Which articles are used most?
  - Which screens drive the most help opens?
  - Which searches return nothing?
  - Which articles get negative feedback?
  - Which help links actually drive product action?

## Workstream 8: Content Expansion and Editorial Pass

### Goal
Raise content quality on the most support-heavy tasks.

### Required content updates
- Rewrite and strengthen these initial articles:
  - Cómo un residente se une a un grupo
  - Diferencia entre invitación y solicitud de acceso
  - Cómo funciona el enlace compartido de colonia
  - Cómo administrar miembros y roles
  - Cómo aprobar o rechazar solicitudes de acceso
  - Cómo funcionan los fondos y pagos
  - Cómo reservar recursos compartidos
  - Cómo funcionan eventos, publicaciones y encuestas
- Add up to 4 additional articles only if needed to fill obvious gaps:
  - cómo salir de un grupo
  - cómo entender estados de pago
  - cómo funcionan bloqueos de recursos
  - cómo elegir el grupo correcto

### Editorial rules
- Keep every article short and task-oriented.
- Avoid internal/technical vocabulary.
- Prefer consequences and next steps over system description.
- Use real-world neighborhood framing.

### Acceptance
- The top 8 articles are support-ready and operationally useful.
- The team can map each priority screen to at least one clearly relevant article.

## UI/UX Changes

### New or updated surfaces
- `/help`
  - role-aware home
  - better search
  - task-first sections
- `/help/[slug]`
  - standardized article layout
  - related articles
  - feedback block
- Contextual help panels
  - improved screen-specific payloads
  - stronger CTA behavior
- `UserMenu`
  - keep Help entry as-is unless design requires repositioning

### Design constraints
- Reuse the existing dashboard-v2 visual system.
- Keep modal on mobile and side panel on desktop.
- No major nav redesign in this phase.
- Keep performance acceptable for SSR pages; help content should remain lightweight.

## Documentation and Contracts
Update:
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

Add:
- `docs/HELP_CENTER_V2_IMPLEMENTATION_PLAN.md`
  - this plan, copied into the repo as the tracking source of truth

The plan doc should include explicit checklist markers by milestone so progress can be tracked in Git.

## Test Plan

### Functional
- Help center opens from `UserMenu` across dashboard, profile, admin, and platform.
- `/help` changes recommended content according to user role.
- Search returns expected articles for common operational queries.
- Zero-result searches show fallback guidance.
- Article detail renders full structured content and related links.
- Contextual help panels render on all priority screens.
- Contextual help links navigate to the correct article.
- English UI shows Spanish help plus a visible notice.
- Helpfulness feedback UI submits correctly.

### Regression
- Existing dashboard, invites, request-access, funds, and resources layouts remain intact.
- No auth redirect regressions for `/help` and `/help/[slug]`.
- No navigation regression from adding Help to `UserMenu`.

### Analytics validation
- Events fire with expected payload shape from:
  - menu open path
  - search
  - article open
  - contextual help open
  - helpfulness submit

## Milestones

### Milestone 1: Content model and recommendations
- Expand help content schema
- Add role-aware recommendation selectors
- Refactor `/help` to use them

### Milestone 2: Search and article quality
- Add weighted local search
- Improve article detail structure
- Add stronger related-article logic

### Milestone 3: Contextual help V2
- Upgrade contextual panel content
- Improve the top-priority screens first
- Add quick-answer treatment on request-access and members

### Milestone 4: Feedback and analytics
- Add article helpfulness UI
- Add interaction events and measurement hooks

### Milestone 5: QA and documentation
- Update product docs
- Add Playwright/manual test coverage
- Validate role-based behavior and English fallback

## Tracking Format
Track this work as one epic with five milestones and these workstreams:
- Content model
- Recommendations
- Search
- Contextual help
- Feedback/analytics
- Editorial pass
- QA/docs

Each milestone should be closed only when:
- product behavior is shipped
- content is present
- docs are updated
- QA coverage is added

## Risks and Mitigations
- Risk: help becomes too broad and hard to maintain
  - Mitigation: keep V2 limited to high-friction journeys and top roles
- Risk: search quality still feels weak
  - Mitigation: add curated keywords/supportSignals before considering infrastructure changes
- Risk: analytics plumbing takes longer than content work
  - Mitigation: keep event contract simple and emit the minimum viable payloads
- Risk: English users see inconsistent bilingual experience
  - Mitigation: keep a clear Spanish-only notice until translated article support exists
- Risk: contextual help becomes repetitive
  - Mitigation: each screen entry must be authored for that screen, not copied from article summaries

## Assumptions
- Help content remains code-based in this phase.
- Spanish remains the only full article language in V2.
- There is an existing or acceptable place to emit lightweight product analytics events.
- The team wants one tracked implementation document in the repo as the source of truth.
