# Seeding and Test Data

## Seed Coverage
Current seed creates multi-neighborhood baseline data:
- 1 platform admin:
  - `admin@vecinohub.local` / value from `SEED_ADMIN_PASSWORD`
- 2 standard users:
  - `ana@vecinohub.local` / value from `SEED_USER_PASSWORD`
  - `luis@vecinohub.local` / value from `SEED_USER_PASSWORD`
- 2 neighborhoods:
  - `colonia-centro`
  - `jardines-del-sur`
- Neighborhood memberships including neighborhood admins and neighbors.
- 2 groups (one per neighborhood) with active memberships.
- Poll/campaign/events/posts across neighborhoods.

## Local Setup
1. `npm run db:up`
2. `npm run db:migrate`
3. Set `REDIS_URL`
4. Set `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`
5. Optional but recommended for auth flows: point `SMTP_*` to a local mail catcher
6. Optional for social sign-in coverage: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
7. `npm run seed`
8. Optional migration safety script: `npm run backfill:neighborhoods`

## Notes
- Seed is idempotent for users/neighborhoods/memberships and skips bulk domain inserts when groups already exist.
- Role compatibility keeps legacy `admin` value valid, but seeded admin user is `platform_admin`.
- Seed credentials are development-only and are no longer committed in the repository.
- Auth sessions now use Redis-backed secondary storage, so local auth flows require `REDIS_URL` in addition to `DATABASE_URL`.
