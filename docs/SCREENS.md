# Screens and UI Map

## Auth
- Login
- Register
- SSR: no
- CSR: yes

## Dashboard
- Summary widgets: groups, polls, open payment requests
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

## Payments
- Payment requests list
- Report payment (cash or wire transfer) via separate report page
- Multiple reports per group, per-report amount
- Admin report status updates + filters
- SSR: yes for lists and detail
- CSR: report and confirm actions

## Admin Panel
- Users list, role edits, status
- Group management
- Poll management
- Payment request management
