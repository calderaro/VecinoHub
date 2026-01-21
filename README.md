# VecinoHub

Neighborhood administration for house groups: membership, polls, and shared payments.

## Features

### Groups & Membership
- Create and manage house groups with designated group admins
- Add and remove members within groups
- Users can belong to multiple groups
- Role-based access: User, Group Admin, and System Admin

### Polls & Voting
- Create polls with customizable options (including optional amounts)
- Draft, active, and closed poll states
- One vote per group — subsequent votes overwrite until poll closes
- Track participation rates across groups
- Reset polls to draft (clears all votes)

### Fundraising Campaigns
- Create goal-based fundraising campaigns
- Automatic per-group amount calculation based on active groups
- Support for cash and wire transfer contributions
- Wire transfer proof: reference number, date, and amount
- Contribution status workflow: submitted → confirmed/rejected
- Track collection progress and pending contributions

### Events
- Create neighborhood events with date, time, and location
- View upcoming events calendar

### News & Posts
- Admin-authored posts for neighborhood-wide announcements
- Draft and publish workflow
- Chronological news feed for residents

### User Profiles
- Email-based authentication
- Customizable public username and profile photo
- Personal dashboard with group memberships

### Admin Dashboard
- Overview of active polls, campaigns, events, and posts
- Track items needing attention (drafts, pending contributions)
- Manage users, groups, and all content

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Create `.env` from the template:

```bash
cp .env.example .env
```

3) Run migrations and seed data:

```bash
npm run db:up
npm run db:migrate
npm run seed
```

4) Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/SCREENS.md`
- `docs/PERMISSIONS.md`
- `docs/SEEDING.md`
- `docs/QA.md`
