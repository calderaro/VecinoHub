# VecinoHub Agent Guide

This file orients coding agents to the VecinoHub repo. Follow it in addition
to project docs. If guidance conflicts, use the priority order below.

## Sources of truth (priority order)
- docs/RULES.md and docs/ARCHITECTURE.md
- docs/PRD.md
- docs/DATA_MODEL.md, docs/API.md, docs/PERMISSIONS.md
- docs/SCREENS.md, docs/QA.md, docs/SEEDING.md, docs/IMPLEMENTATION_PLAN.md

## Repository layout
- src/app: Next.js App Router routes and pages (SSR-first).
- src/services: domain services with validation, business logic, and DB access.
- src/server/trpc: tRPC routers, context, and service error handling.
- src/db: Drizzle schema and db client.
- src/components: shared UI components.
- src/lib: shared utilities and client helpers.
- docs: product, architecture, API, data model, permissions, QA checklists.

## Commands (build/lint/test)
- Install deps: npm install
- Dev server: npm run dev
- Production build: npm run build
- Start prod server: npm run start
- Lint: npm run lint
- Lint single file: npm run lint -- path/to/file.tsx
- DB up/down: npm run db:up | npm run db:down
- Migrations generate/apply: npm run db:generate | npm run db:migrate
- Seed data: npm run seed

## Tests
- No automated test runner configured in package.json.
- No test files found in the repo.
- For acceptance coverage, use docs/QA.md as manual test checklist.
- If you add tests, document how to run a single test here.

## Architecture rules (non-negotiable)
- SSR-first for read-only pages. Use services directly from server pages.
- All mutations go through tRPC.
- Services layer owns validation, business logic, and DB access.
- tRPC routers must stay thin and call services only.
- No direct DB access from pages or routers beyond services.

## Data model and migrations
- Keep schema aligned with docs/DATA_MODEL.md (tables, enums, constraints).
- Respect unique constraints (ex: one vote per group per poll).
- Include auditing fields (created_by, confirmed_by) where specified.
- Never hand-write migrations; use Drizzle Kit.
- Update src/db/schema.ts then run npm run db:generate and npm run db:migrate.
- Review generated migrations before applying.

## Permissions and access control
- Enforce server-side checks per docs/PERMISSIONS.md.
- Group admins can only manage members of their own group.
- Validate membership before read-only SSR access when required.

## API contract
- Keep routers aligned with docs/API.md (names, responsibilities, inputs).
- Prefer adding/adjusting service methods before expanding router surface.
- Use getServiceContext + handleServiceError in routers.

## Rendering and client data
- SSR whenever possible; use CSR only for interactive forms.
- Client-side data fetching must use React Query.
- New client-side forms must use React Hook Form unless the feature already has a legacy form.
- For client tRPC, use @trpc/react-query integration.

## Code style and conventions
- Language: TypeScript with strict type checking (tsconfig strict true).
- Formatting: rely on eslint-config-next defaults; 2-space indent used in repo.
- Quotes: double quotes for strings and imports.
- Semicolons: present consistently; follow existing file style.
- Imports: order external, then absolute @/, then relative.
- Keep one blank line between import groups.
- Prefer named exports in services and routers.
- Use import type for type-only imports.

## Naming conventions
- Functions/variables: camelCase.
- Components: PascalCase.
- Zod schemas: <name>Schema and const for schema definitions.
- Services: verbs like listUsers, updateUserRole, createCampaign.
- Database fields: snake_case in schema; JS properties are camelCase.
- Enums: lower-case string literals (see src/db/schema.ts).

## Validation and error handling
- Validate inputs in services with Zod before DB access.
- Services throw ServiceError with code:
  - UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INVALID
- tRPC routers must catch and pass errors to handleServiceError.
- Do not return raw errors to the client.
- Check for not-found results and raise ServiceError("...", "NOT_FOUND").

## Service-layer expectations
- Keep all business logic in src/services.
- Avoid embedding business logic inside routers or pages.
- Use guards (requireAdmin, requireGroupAdmin, etc.) for permissions.
- Avoid N+1 queries; batch in services when necessary.

## UI and UX expectations
- Match screens and SSR/CSR split in docs/SCREENS.md.
- Respect MVP scope and roles in docs/PRD.md.

## Documentation touchpoints
- Update docs/API.md when router inputs/outputs or endpoints change.
- Update docs/DATA_MODEL.md and docs/SEEDING.md when schema changes.
- Update docs/PERMISSIONS.md when access rules change.
- Update docs/SCREENS.md when a screen flow or UI contract changes.
- Update docs/QA.md with new or modified manual checks.

## QA checklist
- Use docs/QA.md for flows you touch.
- Add or update tests for permissions/critical mutations when feasible.

## Change checklist
- SSR-first + services-only DB access followed?
- Mutations routed through tRPC?
- Permissions enforced server-side?
- Docs updated (API, data model, screens, permissions)?
- QA checklist considered for impacted flows?
