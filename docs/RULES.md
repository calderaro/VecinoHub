# VecinoHub Project Rules

## Architecture Notes (Guiding Rules)
- SSR-first: prefer server-side data access for read-only queries.
- tRPC for mutations: all writes go through tRPC routers.
- Services layer: all business logic, validation, and DB access live in `src/services/`.
- Pages read pattern: server components/pages call services directly for SSR; avoid unnecessary client fetching.

## Rendering & Architecture
- Prefer SSR whenever possible; use CSR only when necessary (e.g., interactive forms).

## API & Mutations
- All mutations must go through tRPC.
- Avoid direct client-side database access.

## Services Layer
- Maintain a dedicated services layer for all database interactions.
- Perform data validation in the services layer.
- Business logic must live in the services layer.
- tRPC routes should call services and avoid embedding business logic.
- For read-only data access, pages can call services directly to enable SSR and avoid unnecessary tRPC routes and client-side data fetching.
