# VecinoHub Agent Guidelines

This file guides ChatGPT Codex to implement changes consistently with the
project docs. Treat it as a "how to work here" reference.

## Source of Truth
- Primary docs: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`,
  `docs/DATA_MODEL.md`, `docs/API.md`, `docs/PERMISSIONS.md`,
  `docs/SCREENS.md`, `docs/QA.md`, `docs/SEEDING.md`,
  `docs/IMPLEMENTATION_PLAN.md`.
- If you change behavior, update the relevant doc(s) to stay aligned.
- If docs conflict, prefer `docs/RULES.md` and `docs/ARCHITECTURE.md`, then
  `docs/PRD.md`, then the rest.

## Architecture Rules (Non-Negotiable)
- **SSR-first** for read-only pages. Use services directly from server pages.
- **All mutations go through tRPC**.
- **Services layer** (`src/services/`) owns validation, business logic, and DB
  access. tRPC routers call services only.
- **No direct DB access from pages or tRPC routers** beyond service calls.

## Data Model Alignment
- Keep schema aligned with `docs/DATA_MODEL.md` (tables, enums, constraints).
- Respect unique constraints (e.g., one vote per group per poll).
- Include auditing fields (`created_by`, `confirmed_by`) where specified.

## Permissions and Access Control
- Enforce server-side checks per `docs/PERMISSIONS.md`.
- Group admins can only manage members of their own group.
- Validate membership before read-only SSR access when required.

## API Contract
- Keep routers aligned with `docs/API.md` (names, responsibilities, inputs).
- Prefer adding/adjusting service methods before expanding router surface.

## UI/UX Expectations
- Match screens and SSR/CSR split in `docs/SCREENS.md`.
- Use CSR only for interactive forms; keep data loading on SSR when possible.
- Client-side data fetching must use React Query.
- Client-side forms must use React Hook Form.

## Client Data and Forms
- For client-side tRPC usage, use the React Query integration per
  `https://trpc.io/docs/client/react`.

## Product Scope
- MVP scope and roles are defined in `docs/PRD.md`.
- Do not introduce new roles or features without updating PRD and permissions.

## QA and Testing
- Use `docs/QA.md` as the acceptance checklist for flows you touch.
- Add or update tests for permissions or critical mutations when feasible.

## Seeding
- Keep seed data aligned with `docs/SEEDING.md`.
- If schema changes, update seed script and docs together.

## Code Style and Structure
- Keep logic in services. Routers are thin, pages are for data orchestration.
- Prefer clear, explicit validation and error handling in services.
- Avoid unnecessary client fetching; prefer SSR data dependencies.

## Change Checklist (Use for every task)
- Does it follow SSR-first + services-only DB access?
- Are mutations routed through tRPC?
- Are permissions enforced server-side?
- Do docs need updates (API, data model, screens, permissions)?
- Does the QA checklist cover this change?

