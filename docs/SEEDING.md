# Seeding and Test Data

## Seed Coverage
Current seed creates multi-neighborhood baseline data:
- 1 platform admin:
  - `admin@vecinohub.local` / `Admin123!`
- 2 standard users:
  - `ana@vecinohub.local` / `User123!`
  - `luis@vecinohub.local` / `User123!`
- 2 neighborhoods:
  - `colonia-centro`
  - `jardines-del-sur`
- Neighborhood memberships including neighborhood admins and neighbors.
- 2 groups (one per neighborhood) with active memberships.
- Poll/campaign/events/posts across neighborhoods.

## Local Setup
1. `npm run db:up`
2. `npm run db:migrate`
3. `npm run seed`
4. Optional migration safety script: `npm run backfill:neighborhoods`

## Notes
- Seed is idempotent for users/neighborhoods/memberships and skips bulk domain inserts when groups already exist.
- Role compatibility keeps legacy `admin` value valid, but seeded admin user is `platform_admin`.
