# QA Checklist (MVP)

## Auth
- Register new user via email
- Login/logout
- Session persists across refresh

## Groups
- Admin creates group
- Admin assigns group admin
- Group admin adds/removes member
- User can view their group members

## Polls
- Admin creates poll and options
- Group member votes once per group
- Admin sees results summary

## Fundraising
- Admin creates campaign
- User submits cash contribution
- User submits wire transfer contribution (reference, date, amount required)
- Admin confirms contribution
- User sees updated status

## Access Control
- Non-admin cannot access admin routes
- User cannot edit groups they do not belong to
- User cannot vote for a group they do not belong to
