# Screens and UI Map

## Auth
- Login
- Register
- SSR: no
- CSR: yes

## Dashboard
- Summary widgets: groups, polls, active campaigns
- Summary widgets: upcoming events, latest posts
- SSR: yes (services)

## Groups
- List groups (admin)
- Group detail: members, admin, membership actions
- SSR: yes (services)
- CSR: minimal (member add/remove forms)

## Polls
- Poll list and details
- Admin poll detail: options manager (add/edit/delete), launch/close/re-open/reset
- Vote form per group (neighbor only)
- Results summary with participation (admin)
- SSR: yes for lists and details
- CSR: vote form only, option management dialogs

## Fundraising
- Campaigns list
- Submit contribution (cash or wire transfer) via separate contribution page
- Multiple contributions per group, per-contribution amount
- Admin contribution status updates + filters
- SSR: yes for lists and detail
- CSR: contribution and confirm actions

## Profile
- Update username and profile photo
- SSR: yes (current profile)
- CSR: yes (photo URL + save)

## Events
- Events list and details
- Admin create/edit/delete
- SSR: yes for lists and detail
- CSR: admin forms

## News/Posts
- Posts list and details
- Admin create/edit/publish/unpublish
- SSR: yes for lists and detail
- CSR: admin editor

## Admin Panel
- Users list, role edits, status
- Group management
- Poll management
- Campaign management
- Events management
- Posts management
