# VecinoHub Stack Playbook
This document captures the tech stack, architecture, and conventions in this
repo so they can be replicated consistently in other projects.

## Goals
- Provide a repeatable blueprint for new projects.
- Preserve the SSR-first + services + tRPC mutation architecture.
- Keep docs, schema, and API contracts in sync.

## Tech Stack (Current)
### Runtime and Framework
- Next.js (App Router) + React + TypeScript.

### API + Data
- tRPC for all mutations.
- Drizzle ORM + PostgreSQL.
- Zod for input validation.
- SuperJSON for transport serialization.

### Auth
- better-auth for sessions and auth flows.

### Client Data + Forms
- TanStack React Query for client fetching.
- React Hook Form for client forms.

### Tooling
- ESLint.
- Tailwind + PostCSS.
- drizzle-kit for migrations.
- tsx for scripts (seed).

See `package.json` for the exact versions.

## Architecture Principles
These are mandatory:
- **SSR-first**: prefer server-side data access for read-only queries.
- **tRPC for mutations**: all writes go through tRPC routers.
- **Services layer**: all business logic, validation, and DB access live in
  `src/services/`.
- **Pages read pattern**: server components/pages call services directly for
  SSR; avoid unnecessary client fetching.
- **Validation**: Zod schemas in services and tRPC.

Source of truth: `docs/ARCHITECTURE.md` and `docs/RULES.md`.

## Folder Layout
- `src/app/`: Next.js routes and pages.
- `src/app/api/`: API entrypoints (tRPC + auth routes).
- `src/server/trpc/`: tRPC router, context, middleware.
- `src/services/`: domain services (users, groups, polls, payments).
- `src/db/`: Drizzle config and schema.
- `src/lib/`: shared helpers/utilities.
- `drizzle/`: migrations and drizzle metadata.
- `scripts/`: one-off scripts (seed).

## Request Flows
### Read-only (SSR)
1) SSR page loads.
2) Page calls a service for read-only data.
3) Service validates and queries the DB.
4) Page renders HTML on the server.

### Mutations
1) Client action triggers a tRPC mutation.
2) tRPC router calls the service.
3) Service validates, applies business logic, writes to DB.
4) tRPC returns the result to the client.

## Services Layer Contract
All services must:
- Validate input with Zod.
- Enforce permissions and scope.
- Perform all DB access through Drizzle.
- Throw typed service errors for invalid input or access issues.

Services are the only place that should contain business logic.

## API Contract (tRPC)
- Mutations live in tRPC routers only.
- Read-only data should use services directly in SSR pages where possible.
- Keep routers aligned with `docs/API.md`.

## Data Model Contract
- Keep schema aligned with `docs/DATA_MODEL.md`.
- Migrations live in `drizzle/`.
- Any schema update requires a migration and a docs update.

## Permissions and Guards
Rules:
- All mutations must verify role and group scope.
- Read-only SSR calls must verify membership or admin role when applicable.

Source of truth: `docs/PERMISSIONS.md`.

## Rendering Rules
- SSR preferred for lists and detail pages.
- CSR only for interactive forms and actions.
- Client fetching must use React Query.
- Client forms must use React Hook Form.

Source of truth: `docs/SCREENS.md` and `docs/RULES.md`.

## Environment and Setup
1) Install deps: `npm install`
2) Copy env: `cp .env.example .env`
3) Run migrations: `npm run db:migrate`
4) Seed data: `npm run seed`
5) Start dev server: `npm run dev`

## QA and Testing
- Align tests and manual QA with `docs/QA.md`.
- Prioritize permissions and critical mutations.

## Replication Checklist
Use this when bootstrapping a new project:
1) Scaffold Next.js (TypeScript, App Router).
2) Install stack dependencies (tRPC, Drizzle, better-auth, Zod, React Query).
3) Create the folder layout in this playbook.
4) Implement the services layer contract and tRPC mutation rules.
5) Add docs: ARCHITECTURE, RULES, API, DATA_MODEL, SCREENS, PERMISSIONS, QA.
6) Add `.env.example`, migrations folder, and seed script.
7) Align SSR/CSR rules with this playbook.
