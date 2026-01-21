# Seeding and Test Data

## Baseline Seed
- 1 admin user (email + password)
- 2 normal users
- 2 groups (houses)
- Assign group admins and memberships
- 1 poll with 2 options
- 1 payment request
- 1 submitted payment report (wire transfer)

## Local Seed Steps
1) Run migrations.
2) Run `npm run seed`.
3) Log in as admin and verify lists.

## Data Notes
- Use realistic amounts and dates.
- Ensure one user belongs to multiple groups.
- Default credentials (change after first login):
  - `admin@vecinohub.local` / `Admin123!`
  - `ana@vecinohub.local` / `User123!`
  - `luis@vecinohub.local` / `User123!`
