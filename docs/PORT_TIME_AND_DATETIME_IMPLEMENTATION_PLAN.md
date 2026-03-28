# Neighborhood Port-Time and DateTime UX Implementation Plan

## Purpose
This document defines the implementation plan for the next scheduling and date-time foundation upgrade in VecinoHub. The goal is to make neighborhood timezone behavior explicit, consistent, and enforceable across the application, while replacing browser-native date and time controls with a reusable, higher-quality date-time selection experience.

This initiative is not a narrow UI enhancement. It is a cross-cutting platform change that affects:
- neighborhood configuration
- date and time rendering rules
- form inputs and validation contracts
- service-layer scheduling logic
- QA expectations and documentation

The primary business objective is to ensure that every neighborhood-scoped workflow operates in the neighborhood’s own official time, regardless of the user’s browser locale, operating system timezone, or device defaults.

## Problem Statement
VecinoHub now supports neighborhood-level timezone configuration and resource reservations that depend on local scheduling rules. The current system still has several weaknesses:
- timezone selection is still treated as a free-form text field in some flows
- parts of the UI still rely on browser-native date and time controls
- some client rendering paths can still drift toward browser-local timezone behavior
- the app does not yet provide one reusable date-time selection primitive designed for neighborhood-scoped scheduling

Those gaps introduce a real product risk:
- two users in different browser timezones can interpret the same record differently
- native date inputs encourage browser-local parsing semantics that are incompatible with the product requirement
- feature teams can reintroduce inconsistent time handling if no shared component and utility layer exists

## Product Rule to Lock
For neighborhood-scoped data, VecinoHub must use **port time**.

Port time means:
- all user-facing date and time values must be interpreted in the neighborhood timezone
- all user-facing date and time values must be rendered in the neighborhood timezone
- browser-local timezone must not change the displayed clock time or the meaning of a selected date or time
- UTC remains the storage format for persisted timestamps
- IANA timezone identifiers remain the canonical timezone representation

This rule applies to:
- resources and reservations
- events
- fundraising deadlines and contribution dates where neighborhood-local meaning matters
- fund periods, due dates, payment dates, and any other neighborhood-scoped scheduling workflows
- neighborhood administration screens that display neighborhood-local date or time values

## Objectives
- Replace free-form timezone entry with a validated select backed by `timezones.json`.
- Introduce a shared timezone catalog adapter for both validation and UI rendering.
- Create a single app-wide port-time utility layer so date handling does not fragment by feature.
- Build a reusable custom date-time selector dialog for `date`, `time`, and `datetime` modes.
- Replace all browser-native date and time inputs in neighborhood-scoped flows.
- Ensure all displays ignore browser-local timezone and consistently use neighborhood timezone.
- Update canonical docs so the rule is part of the project contract rather than an implementation detail.

## Non-Goals
- This plan does not change storage from UTC to local timestamps.
- This plan does not introduce a generic “user preferred timezone” feature.
- This plan does not attempt to support arbitrary timezone overrides per screen or per user.
- This plan does not add manual approval, waitlists, or new reservation policy features.
- This plan does not redesign unrelated non-date forms unless they require the new selector.

## Success Criteria
- A neighborhood admin can only choose a valid IANA timezone from a searchable select.
- Two users in different browser timezones see the same rendered clock time for the same neighborhood record.
- No neighborhood-scoped form relies on `type="date"`, `type="time"`, or `type="datetime-local"` as the primary input control.
- All scheduling-sensitive mutations use a shared parsing contract that is independent of browser-native input semantics.
- The new date-time selector is reusable, accessible, localized through existing app patterns, and suitable for both resident and admin surfaces.
- Docs, QA, and release notes clearly define the port-time rule and how it must be tested.

## Architectural Constraints
- Preserve the repository’s SSR-first read model.
- Keep all writes behind tRPC mutations.
- Keep validation, conversion, and scheduling logic in `src/services/` and shared utilities under `src/lib/`.
- Do not parse user-entered date and time values directly in pages or routers.
- Do not let React components embed business logic about timezone cutoffs, quotas, or scheduling rules.
- Keep i18n through `next-intl`; new UI copy and labels must be localized.
- Add or preserve `data-testid` coverage for all new and migrated inputs.

## Delivery Strategy
This work should be executed as a foundation refactor with controlled vertical rollout:

1. Lock the product rule and update docs first.
2. Add the timezone catalog and shared port-time utilities.
3. Build the reusable custom selector system.
4. Migrate the highest-risk reservation flows first.
5. Migrate remaining neighborhood-scoped forms and displays.
6. Finish with regression QA, documentation closure, and removal of leftover native inputs.

This order matters because the UI migration is only safe after the value contract and timezone logic are stable.

## Workstreams
- Product and documentation alignment
- Timezone catalog integration
- Port-time utility foundation
- Reusable date-time selector design system
- Form migration and validation contract changes
- Display formatting migration
- QA and regression coverage
- Release readiness and engineering guardrails

## Milestone 0: Documentation and Contract Alignment
Goal: make the port-time rule and the custom selector migration part of the official project contract before implementation expands.

### 0.1 Canonical docs to update
Update the following documents before or alongside the first implementation merge:
- `docs/PRD.md`
- `docs/API.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/IMPLEMENTATION_PLAN.md`

Recommended supporting updates:
- `docs/DATA_MODEL.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`
- `docs/STACK_PLAYBOOK.md`

### 0.2 Product decisions to lock
The following decisions must be explicit:
- neighborhood-scoped workflows use neighborhood time only
- browser timezone is never the source of truth for displayed or selected neighborhood dates
- timezone values are stored as IANA identifiers only
- timezone entry must use a controlled select, not arbitrary text input
- custom date-time controls replace browser-native inputs in neighborhood-scoped forms
- date-only, time-only, and datetime inputs must all use the same shared component family
- UTC remains the persistence format for timestamps

### 0.3 Documentation deliverables
The canonical docs should explicitly describe:
- what port time is
- where it applies
- how forms interpret selected values
- which routes and forms are impacted
- which manual QA scenarios verify cross-timezone behavior
- which UI components are approved for date and time entry

### 0.4 Exit criteria
- No ambiguity remains about whether browser-local timezone can affect neighborhood-scoped screens.
- The team agrees that native date inputs are being phased out, not preserved as a fallback.
- The documentation backlog for this initiative is assigned and sequenced with engineering work.

## Milestone 1: Timezone Catalog Integration
Goal: replace free-form timezone entry with a validated, reusable, searchable timezone selection system.

### 1.1 Dependency integration
Add `timezones.json` as the canonical source for timezone option data.

Implementation requirements:
- wrap the library in a local adapter instead of consuming it ad hoc in components
- avoid leaking raw third-party data shapes into app UI or validation logic
- keep the adapter stable even if the upstream package shape changes later

Recommended module:
- `src/lib/timezones/catalog.ts`

### 1.2 Local adapter responsibilities
The adapter should expose:
- `listTimezoneOptions()`
- `findTimezoneOption(value)`
- `isValidTimezone(value)`
- `getTimezoneLabel(value)`

Each normalized option should contain:
- `value`: IANA timezone identifier
- `label`: human-readable name for UI
- `offsetLabel`: current or canonical GMT/UTC offset label for scanning
- `searchText`: aliases and searchable text for combobox filtering

### 1.3 UI integration
Replace free-form timezone input in neighborhood management with a searchable select or combobox.

Primary impact area:
- `src/components/platform/neighborhood-form.tsx`

Behavior requirements:
- user cannot submit an arbitrary timezone string
- existing stored timezone values must hydrate correctly in edit mode
- the component must remain keyboard-accessible
- labels and help text must explain that this timezone controls neighborhood scheduling and date display

### 1.4 Validation requirements
- service validation must reject invalid timezone identifiers
- form validation must prevent empty or malformed values before mutation
- router inputs should accept only normalized timezone strings, not entire option objects

### 1.5 Acceptance criteria
- no neighborhood timezone form uses a plain text input
- invalid timezone strings cannot be persisted through the UI or mutation layer
- timezone labels display consistently across create and edit flows

## Milestone 2: Shared Port-Time Foundation
Goal: create one app-wide date and time utility layer that enforces neighborhood-local interpretation and formatting.

### 2.1 New shared module
Create a shared utility layer, for example:
- `src/lib/port-time.ts`

Existing timezone logic in feature-specific service code should be consolidated into this shared module where appropriate.

### 2.2 Shared utility responsibilities
The port-time module should own:
- UTC to neighborhood-local conversion helpers
- neighborhood-local formatting helpers for date-only and date-time output
- extraction of year, month, day, hour, minute, weekday in a target timezone
- date-key generation in a target timezone
- conversion from `{ dateKey, hour, minute, timeZone }` into UTC timestamps
- “today” and “now” calculations in neighborhood timezone
- consistent parsing helpers that avoid browser-local `Date` assumptions

### 2.3 Proposed helper surface
The exact API can evolve, but the module should cover functions similar to:
- `formatPortDate(date, timeZone, locale)`
- `formatPortDateTime(date, timeZone, locale)`
- `formatPortTime(date, timeZone, locale)`
- `toPortParts(date, timeZone)`
- `getPortDateKey(date, timeZone)`
- `getPortMinuteOfDay(date, timeZone)`
- `toUtcFromPortDateTime({ dateKey, hour, minute, timeZone })`
- `getPortNow(timeZone)`
- `getPortToday(timeZone)`

### 2.4 Design rules
- never rely on the browser runtime timezone for business meaning
- never duplicate timezone conversion logic per feature
- avoid mixing direct `new Date(input)` parsing with manual timezone math
- centralize formatting rules so future features inherit the same behavior

### 2.5 Refactor expectations
Affected domain code likely includes:
- `src/services/resources.ts`
- event formatting and validation flows
- fund and fundraising date handling
- list and detail pages that currently format dates with implicit local semantics

### 2.6 Acceptance criteria
- one shared utility layer is used by all migrated features
- no neighborhood-scoped display path depends on browser timezone semantics
- service-layer scheduling logic reads clearly and no longer embeds duplicated conversion code

## Milestone 3: Reusable DateTime Selector Component System
Goal: build a reusable component family that replaces native date and time inputs with a high-quality, port-time-safe interaction model.

### 3.1 UX requirements
The new control should follow the reference direction supplied for this initiative:
- dialog-based interaction
- left-side calendar selection
- right-side time controls for hour and minute
- explicit cancel and apply actions
- clear visual emphasis for selected values
- suitable for both resident and admin workflows

The component should feel operational and precise rather than decorative. It must support scheduling tasks where mistakes are costly.

### 3.2 Component architecture
Build a reusable component family rather than a one-off widget:
- `DateTimeField`
- `DateTimeDialog`
- `CalendarPanel`
- `TimeColumn`
- `DateField`
- `TimeField`

Recommended directory:
- `src/components/date-time/`

### 3.3 Supported modes
The component family should support:
- `date`
- `time`
- `datetime`

Mode-specific rules:
- `date` mode hides time selection and returns a stable date-only contract
- `time` mode hides the calendar and returns structured time selection
- `datetime` mode returns both date and time in one apply action

### 3.4 Controlled value contract
Do not use browser-native datetime strings as the source of truth.

Recommended value shapes:
- date-only: `YYYY-MM-DD`
- time-only: `{ hour: number, minute: number }`
- datetime: `{ dateKey: string, hour: number, minute: number }`

The field wrapper may format these for display, but the selected values should remain explicit and structured.

### 3.5 Required props
The component family should support props such as:
- `value`
- `onChange`
- `mode`
- `timeZone`
- `locale`
- `min`
- `max`
- `disabled`
- `disabledDates`
- `disabledTimes`
- `minuteStep`
- `label`
- `placeholder`
- `data-testid`

### 3.6 Interaction details
Required behavior:
- keyboard navigation for calendar grid and time options
- visible focus states
- scrollable time columns for hour and minute
- explicit apply and cancel actions
- no accidental value mutation before apply
- clear selected-state styling
- disabled-state support for out-of-range choices

### 3.7 Accessibility requirements
- dialog semantics with correct labeling
- calendar grid semantics where applicable
- focus trap inside the open dialog
- screen-reader announcements for selected date and time
- keyboard operability without pointer input

### 3.8 Localization requirements
- month names, weekday labels, and button labels must be localized through existing app i18n patterns
- the component must still interpret values in neighborhood timezone even when localized text changes
- 24-hour display should be supported and should be the default where operational clarity matters

### 3.9 Styling and design direction
The control should be intentionally designed and consistent with the current UI system:
- clean panelized layout
- strong contrast for current selection
- operational clarity over native-browser familiarity
- compact enough for repeated admin use
- reusable styling tokens rather than page-specific CSS hacks

### 3.10 Acceptance criteria
- the dialog works in date, time, and datetime modes
- the value contract is explicit and consistent across all modes
- the control is reusable across resources, events, funds, and fundraising
- selected values do not change meaning across different browser timezones

## Milestone 4: Form Contract Migration
Goal: replace browser-native date and time inputs with the new component family and normalize payload contracts.

### 4.1 Migration principle
Do not perform an uncontrolled one-file-at-a-time swap without standardizing input contracts first. Each migrated form should:
- use the new field components
- submit structured values or normalized strings
- delegate parsing to shared utilities and services

### 4.2 Priority migration order
Recommended migration order:
1. neighborhood timezone admin form
2. resource reservation form
3. resource block form
4. resource availability windows
5. events form
6. fund period form
7. fund movement and payment forms where date semantics are neighborhood-scoped
8. fundraising campaign and contribution forms

### 4.3 Known impact areas
Current native input usage should be removed from:
- `src/components/resources/resource-reservation-form.tsx`
- `src/components/resources/resource-block-form.tsx`
- `src/components/resources/resource-form.tsx`
- `src/components/events/event-form.tsx`
- `src/components/funds/fund-period-form.tsx`
- `src/components/funds/fund-movement-form.tsx`
- `src/components/funds/fund-payment-form.tsx`
- `src/components/funds/fund-template-form.tsx`
- `src/components/fundraising/campaign-form.tsx`
- `src/components/fundraising/contribution-form.tsx`

### 4.4 Mutation payload normalization
Update client-to-server payloads so they do not rely on browser-native datetime formats as hidden contracts.

Examples:
- date-only fields should submit `YYYY-MM-DD`
- time-only fields should submit structured hour/minute or normalized minute-of-day values
- datetime fields should submit a structured local-neighborhood selection that services convert to UTC

### 4.5 Service validation expectations
Services should validate:
- value completeness
- min/max bounds
- ordering rules such as start before end
- domain-specific constraints such as reservation windows, due dates, and duration limits

### 4.6 Acceptance criteria
- no migrated neighborhood-scoped form relies on native date or time controls
- all migrated mutations receive normalized, explicit input values
- browser timezone cannot change the meaning of submitted values

## Milestone 5: Display Formatting Migration
Goal: make date and time rendering consistently use neighborhood timezone across the product.

### 5.1 Scope
Update all neighborhood-scoped display paths so they render through the shared port-time formatting layer.

Priority areas:
- resident resource pages
- admin resource pages
- event lists and details
- fund period and due date displays
- fundraising campaign deadlines and contribution timestamps where neighborhood-local meaning is required
- neighborhood administration screens that expose scheduling data

### 5.2 Rendering rules
- if a screen is scoped to one neighborhood, use that neighborhood timezone everywhere on the screen
- if a platform-level screen shows records from multiple neighborhoods, render each record using its own neighborhood timezone or label the timezone explicitly
- never silently fall back to browser-local formatting for neighborhood-scoped records

### 5.3 SSR and client concerns
- SSR output must already reflect the neighborhood timezone so first render is correct
- client hydration must not reformat values into browser-local time
- any client-side refresh logic must use the same shared formatter

### 5.4 Acceptance criteria
- users in different browser timezones see the same displayed local clock time for a given neighborhood record
- no hydration mismatch occurs because client code reformats in a different timezone than SSR

## Milestone 6: QA, Regression Gates, and Safety Nets
Goal: verify correctness across scheduling logic, timezone rendering, and interaction behavior.

### 6.1 Unit test targets
Add tests for:
- timezone catalog adapter normalization
- timezone identifier validation
- port-time conversion helpers
- DST-sensitive date transitions where applicable
- formatting helpers for date-only, time-only, and datetime rendering

### 6.2 Service test targets
Add or extend service coverage for:
- reservation creation in neighborhood timezone
- reservation conflict and cutoff validation
- event start/end validation
- fund and fundraising date handling where local meaning matters

### 6.3 UI and interaction test targets
Add tests for:
- timezone select search and selection
- date-time dialog open, cancel, and apply
- keyboard navigation in calendar and time columns
- date-only mode
- time-only mode
- datetime mode
- disabled range behavior

### 6.4 Cross-timezone validation scenarios
Manual or automated QA must verify:
- one tester in a different browser timezone sees the same neighborhood-local displayed time
- selected reservation, event, and due date values persist with the same intended meaning
- SSR and hydrated UI agree on displayed values

### 6.5 Regression gates
Before release:
- grep for remaining `type=\"date\"`
- grep for remaining `type=\"time\"`
- grep for remaining `type=\"datetime-local\"`
- review any remaining occurrences and document explicit exceptions if any survive

### 6.6 Acceptance criteria
- all critical scheduling flows pass QA in at least two different browser timezone settings
- test coverage exists for the shared utility and component foundations
- there are no unexplained native date or time inputs left in neighborhood-scoped forms

## Milestone 7: Documentation Closure and Engineering Guardrails
Goal: ensure the work remains durable after the initial rollout.

### 7.1 Required documentation updates at completion
Update:
- `docs/PRD.md`
- `docs/API.md`
- `docs/SCREENS.md`
- `docs/QA.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PLAYWRIGHT_TEST_RUNS.md`

Update if contracts changed during execution:
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/SEEDING.md`

### 7.2 Documentation content requirements
The final docs should record:
- the definition of port time
- approved timezone input behavior
- approved date-time component usage
- testing guidance for timezone-sensitive workflows
- any known exceptions or non-neighborhood-scoped date handling rules

### 7.3 Engineering guardrails
Recommended follow-up safeguards:
- a short engineering note banning new browser-native date/time controls in neighborhood-scoped flows
- a lightweight code review checklist item for timezone-sensitive features
- optional lint or grep-based CI check to flag forbidden native date/time inputs in targeted folders

### 7.4 Acceptance criteria
- docs reflect the shipped behavior, not just the intended design
- future contributors can discover the port-time rule without reverse-engineering implementation details

## Rollout Notes
- Prefer landing the shared utilities and component family before migrating all screens.
- Migrate the resources domain first because it has the highest scheduling risk.
- Do not mix old and new semantics within the same form if it can be avoided.
- If phased release is needed, hide partially migrated flows behind safe route-level sequencing rather than mixing input paradigms on one page.

## Risks and Mitigations

### Risk: mixed timezone semantics during migration
If some screens still render in browser-local time while others use neighborhood time, users will lose trust quickly.

Mitigation:
- prioritize end-to-end migration of one domain at a time
- document temporary exceptions explicitly
- avoid partially migrating a single flow

### Risk: implicit parsing bugs from native date values
Browser-native controls can still inject local parsing assumptions if they remain part of the data path.

Mitigation:
- replace native inputs rather than wrapping them cosmetically
- use explicit structured value contracts

### Risk: duplicated helper logic across features
If each feature invents its own conversion helper, DST and boundary bugs will multiply.

Mitigation:
- centralize all port-time logic in one shared module
- require service and UI code to consume the shared layer

### Risk: hydration mismatches
SSR could render one timezone while client code reformats into another.

Mitigation:
- make SSR and client formatting consume the same port-time helper layer
- test with browsers set to different local timezones

## Recommended Execution Order
1. Update the docs and lock the product rule.
2. Integrate `timezones.json` and replace timezone free-form input.
3. Extract and stabilize the shared port-time utility layer.
4. Build the reusable date-time selector component family.
5. Migrate resource forms and displays.
6. Migrate event, fund, and fundraising forms and displays.
7. Run timezone-focused QA and remove remaining native inputs.
8. Close the documentation loop and add engineering guardrails.

## Final Deliverables
- a shared timezone catalog adapter backed by `timezones.json`
- a reusable, localized, accessible date-time selector component family
- neighborhood-scoped displays that always render in neighborhood timezone
- migrated forms that no longer depend on browser-native date and time controls
- updated canonical docs and QA guidance

## Implementation Readiness Statement
This plan is suitable for engineering execution. It defines the product rule, architectural boundaries, migration order, UX component expectations, validation contract, QA requirements, and documentation obligations needed to complete the port-time and date-time selector initiative without introducing fragmented timezone behavior across VecinoHub.
