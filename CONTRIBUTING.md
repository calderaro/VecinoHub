# Contributing

Thanks for your interest in VecinoHub. This document covers local setup, how to propose changes, and the conventions the codebase uses.

## Local Setup

Requirements: Node.js 20+, Docker (for Postgres), npm.

```bash
npm install
cp .env.example .env
# Edit .env: set BETTER_AUTH_SECRET (openssl rand -base64 48) and database credentials
npm run db:up         # start Postgres in Docker
npm run db:migrate    # apply Drizzle migrations
npm run seed          # optional: seed development data
npm run dev
```

The app runs at http://localhost:3000.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- tRPC + TanStack Query
- Better Auth (sessions in Postgres)
- Drizzle ORM + PostgreSQL
- Tailwind CSS v4
- next-intl (es / en)
- Vitest (unit + integration) + Playwright (E2E)

## Project Layout

- `src/app/` — Next.js routes (App Router).
- `src/server/` — server-only modules: `better-auth.ts`, `auth.ts` (session resolution), `mail.ts`, `trpc/` routers.
- `src/services/` — business logic + authorization guards. tRPC routers delegate to these.
- `src/db/` — Drizzle schema and DB client.
- `src/messages/` — i18n catalogs.
- `tests/` — Vitest unit and integration tests.
- `playwright/` — E2E tests.

## Workflow

1. Fork and branch from `main`. Use a short topic name: `feat/poll-rotation`, `fix/session-revocation`, `chore/eslint-bump`.
2. Make changes. Keep PRs focused — one concern per PR.
3. Run the validation suite locally (see below).
4. Open a PR against `main` with a description of *why* the change is needed.
5. Security-sensitive changes (auth, authz, session handling, SQL) get extra scrutiny — call them out in the PR description.

## Validation

Before pushing:

```bash
npm run lint
npx tsc --noEmit
npm test
# optional, slower
npm run test:e2e
```

CI runs the same checks. PRs with failing checks won't merge.

## Code Conventions

- Server logic lives in `src/services/`. tRPC routers should be thin wrappers that call into services and convert errors via `handleServiceError`.
- Authorization happens in services through the helpers in `src/services/guards.ts` — never trust client-supplied IDs without a guard.
- Database access goes through Drizzle. Raw SQL is fine via the `sql\`\`` template tag (it's parameterized); never concatenate user input into SQL strings.
- Tests for new services live under `tests/services/`. Use the in-memory pg-mem helper in `tests/helpers/test-database.ts` for fast integration tests.
- Imports: use the `@/` alias (configured in `tsconfig.json`) instead of long relative paths.

## Reporting Security Issues

See [`SECURITY.md`](./SECURITY.md). Don't open a public issue for security reports.

## License

By contributing, you agree that your contributions are licensed under the MIT License (see [`LICENSE`](./LICENSE)).
