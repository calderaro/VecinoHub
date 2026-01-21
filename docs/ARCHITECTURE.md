# Architecture Overview

## Core Principles
- SSR-first: prefer server-side data access for read-only queries.
- tRPC for mutations: all writes go through tRPC routers.
- Services layer: all business logic, validation, and DB access live in `src/services/`.
- Pages read pattern: server components/pages call services directly for SSR; avoid unnecessary client fetching.
- Client data fetching must use React Query.
- Client forms must use React Hook Form.

## Request Flow
1) SSR page loads.
2) Page calls a service for read-only data.
3) Service performs validation, runs DB queries, and returns data.
4) Page renders HTML on the server.

## Mutation Flow
1) Client action triggers a tRPC mutation.
2) tRPC router calls the appropriate service.
3) Service validates input, applies business logic, and writes to DB.
4) tRPC returns the result to the client.

## Folder Layout (Proposed)
- `src/app/`: Next.js routes and pages.
- `src/server/trpc/`: tRPC router, context, and middleware.
- `src/services/`: domain services for users, groups, polls, payments.
- `src/db/`: Drizzle config, schema, migrations.
- `src/components/`: shared UI components.
- `src/lib/`: shared utilities and helpers.

## Error Handling
- Services throw typed errors for invalid input or permission failures.
- tRPC maps service errors to client-safe responses.
- Input validation should use Zod schemas.

## Data Access
- Drizzle is the single DB layer.
- All DB access is funneled through services.

## Performance
- Prefer SSR for read-heavy pages.
- Use pagination for list endpoints.
- Avoid N+1 queries by batching in services.
