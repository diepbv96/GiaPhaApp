# Feature Specification: Selectable Email Templates & Configurable Send Time for Event Notifications

**Feature Branch**: `011-email-template-schedule`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "add feature to define a list email template so admin can select any specific template to config for event email sending. the template is front-end only, don't need saved to db. admin also can select cron job trigger time (default 6 AM HCM/Asia time). create md file to doc how to set up email sending for event notification.  notice: the email template should be generally, it is suitable for deadth date and birthday as well"

## Clarifications

### Session 2026-07-24

- Q: If an Admin changes the send time earlier in the day, before either the old or new time has occurred yet today, should the new time apply starting today or only from tomorrow onward? → A: Applies from tomorrow — today still runs at whatever time was in effect at the start of today, regardless of a later change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a ready-made email template (Priority: P1)

An Admin configuring event-reminder emails no longer has to write the message wording from scratch. From the notification settings screen, they browse a small set of ready-made templates, preview how each one reads, and pick the one that matches the tone they want. The chosen wording becomes the active template for every future reminder email — for both birthdays and death anniversaries — until they pick a different one or edit it further.

**Why this priority**: This is the core of the request and the most visible change for the Admin; without it, the rest of the feature has nothing to attach to.

**Independent Test**: Can be fully tested by opening the notification settings screen, selecting each of the predefined templates in turn, and confirming the preview/active content updates accordingly and reads sensibly for both a sample birthday and a sample death-anniversary event.

**Acceptance Scenarios**:

1. **Given** the Admin is on the notification settings screen, **When** they open the template picker, **Then** they see a list of predefined templates, each with a short label and a preview of its content.
2. **Given** the Admin selects one of the predefined templates, **When** they save, **Then** that template's wording becomes the content used to render every future reminder email until changed again.
3. **Given** a predefined template is rendered for a birthday event and again for a death-anniversary event, **When** the Admin compares the two resulting messages, **Then** both read naturally and correctly (no event-type-specific wording is wrong or missing for either case).
4. **Given** the Admin has picked a predefined template, **When** they further edit the wording afterward, **Then** their edited version is what gets saved and used, and the predefined template remains unchanged and available to pick again later.

---

### User Story 2 - Choose what time of day the daily check runs (Priority: P2)

An Admin wants reminder emails to go out at a time that suits their household rather than a fixed time picked by a developer. From the same settings screen, they set the time of day the system checks for due events and sends reminders, defaulting to 6:00 AM Vietnam time (Asia/Ho_Chi_Minh) if they never change it.

**Why this priority**: Useful and requested, but the feature is still valuable with only User Story 1 delivered (reminders still send, just at the fixed default time) — so it's ordered after the template picker.

**Independent Test**: Can be fully tested by changing the configured send time, waiting for (or manually triggering) the next scheduled run, and confirming the run occurs at the newly configured time rather than the old one.

**Acceptance Scenarios**:

1. **Given** the Admin has never changed the send time, **When** they view the setting, **Then** it shows 6:00 AM Asia/Ho_Chi_Minh as the active value.
2. **Given** the Admin sets a new send time and saves, **When** the next day's check runs, **Then** it runs at the newly configured time, not the previous one.
3. **Given** the Admin changes the send time, **When** the change is saved, **Then** no reminder already sent is re-sent and no occurrence is skipped because of the time change.

---

### User Story 3 - Follow a written guide to set up event emails end-to-end (Priority: P3)

Someone setting up this project for a family (who may not be the original developer) wants to enable event-reminder emails without reverse-engineering the code. They open a single Markdown setup guide in the repository and follow it step by step — provider account, deployment, scheduling, and turning the feature on in the Admin UI — until reminder emails are flowing.

**Why this priority**: Valuable for hand-off and self-service setup, but it documents behavior rather than adding it — ordered last since Stories 1 and 2 must exist for the guide to describe them accurately.

**Independent Test**: Can be fully tested by having someone unfamiliar with the codebase follow only the guide (no other help) and confirm they reach a working, sending configuration.

**Acceptance Scenarios**:

1. **Given** a new Markdown setup guide exists in the repository, **When** a first-time setter-upper follows it top to bottom, **Then** they end up with event-reminder emails enabled and sending, without needing to ask a developer for undocumented steps.
2. **Given** the guide is followed, **When** the reader reaches the section on templates and send time, **Then** it matches what they actually see in the Admin settings screen (User Stories 1 and 2).

---

### Edge Cases

- What happens if the Admin picks a predefined template, then a later version of the app changes or removes that predefined template's definition? The previously saved wording (already applied to the config) keeps working; only the picker's available choices change going forward.
- What happens if the Admin sets a send time but then disables notifications entirely? The chosen time is preserved so it takes effect again if notifications are re-enabled later, but no emails send while disabled (existing behavior).
- What happens if the Admin changes the send time earlier the same day, before today's run has happened yet? Today's run still occurs at the time that was in effect at the start of today (i.e., whatever was configured as of last midnight); the new time only takes effect starting tomorrow.
- What happens if the Admin selects a predefined template, edits it, and then wants to go back to the original wording? Re-selecting the same template from the list restores its original predefined wording, overwriting the edit.
- How does the system handle a predefined template that would render with a missing/unclear value (e.g., no lunar-date translation available for a date)? The existing "not available" fallback behavior for that placeholder continues to apply — predefined templates use the same placeholders as free-form ones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST offer Admins a curated list of at least 3 predefined email templates for event-reminder notifications, defined within the application itself (no database table of templates is required).
- **FR-002**: Each predefined template's wording MUST be generic across event types — worded so that it reads correctly for both a birthday reminder and a death-anniversary reminder without any event-type-specific phrasing outside of the existing event-type placeholder.
- **FR-003**: Admins MUST be able to preview a predefined template's rendered wording before choosing it.
- **FR-004**: Selecting a predefined template MUST replace the currently configured template wording with that predefined template's content, subject to the Admin then saving the change (mirrors the existing save behavior for the notification settings screen).
- **FR-005**: After selecting a predefined template, Admins MUST still be able to further edit the wording before saving, the same as with today's free-form template text.
- **FR-006**: Admins MUST be able to configure the time of day the daily event check/send runs, in addition to the existing enabled/template/lead-time/recipients settings.
- **FR-007**: The configurable send time MUST default to 6:00 AM in the Asia/Ho_Chi_Minh time zone when never explicitly changed by an Admin.
- **FR-008**: Saving a new send time MUST cause the next day's scheduled run onward to occur at that new time, without requiring a separate deployment or manual database step; the current day's run always uses whatever time was already in effect at the start of that day, even if changed later the same day.
- **FR-009**: Changing the send time MUST NOT cause any already-sent reminder to be re-sent, nor cause any due reminder to be skipped.
- **FR-010**: Only the Admin role MUST be able to view or change the template selection and the send-time setting, consistent with the existing restriction on the rest of the notification settings.
- **FR-011**: The repository MUST include a single Markdown document describing, step by step, how to fully set up event-reminder emails: transactional email provider account/credentials, deployment of the sending mechanism, the daily schedule, and how to turn the feature on and configure it (template choice, send time, recipients) from the Admin settings screen.
- **FR-012**: The setup document's steps MUST stay accurate for the template-selection and send-time capabilities described in this feature (i.e., it documents the feature as delivered, not the prior fixed-time/free-text-only behavior).

### Key Entities

- **Predefined Email Template (front-end only)**: A named, ready-made reminder message option an Admin can browse and pick from. Attributes: a short label/name, the message wording (using the same placeholders as free-form templates: person name, event type, Gregorian date, lunar date, days remaining). Not persisted to the database — it exists only as a selectable option; picking one simply pre-fills the Admin's actual, already-persisted template setting.
- **Event Notification Schedule Setting**: The time of day (hour and minute, in Asia/Ho_Chi_Minh time) at which the daily event check/send runs. Extends the existing single, application-wide notification configuration alongside the enabled flag, template text, lead time, and recipients.
- **Event-Reminder Setup Guide**: A Markdown document in the repository serving as the canonical, self-service reference for enabling and configuring event-reminder emails end to end.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can have a fully worded reminder template in effect by selecting from a list, without typing any wording themselves.
- **SC-002**: Every predefined template renders with no leftover placeholder text and no incorrect/mismatched wording when previewed against both a sample birthday and a sample death-anniversary event.
- **SC-003**: An Admin can change the daily send time and confirm the new time is in effect in under 2 minutes of settings-screen interaction, with no separate technical step.
- **SC-004**: A person with no prior knowledge of this codebase can reach a fully working, sending configuration using only the setup guide, with zero undocumented steps required.

## Assumptions

- The existing single, application-wide notification configuration (enabled flag, template text, lead time, default recipients, per-tree recipient overrides) continues to be the single source of truth for what actually gets sent; this feature adds a front-end-only picker that writes into the existing template field, plus one new persisted field for the send time — it does not introduce a separate templates table.
- "Front-end only, don't need saved to db" means the *list of predefined options* (their labels and wording) lives in application code, not that the Admin's final chosen/edited wording goes unsaved — the final wording continues to be saved exactly as it is today.
- The configurable send time is a single hour:minute value in the fixed Asia/Ho_Chi_Minh time zone (no per-Admin time zone selection, no daylight-saving adjustment, matching how "today" is already computed for event matching).
- Saving a new send time takes effect starting the next calendar day (see Clarifications); it never retroactively affects the current day's run, whether that run is still pending, in progress, or already completed.
- A default set of 3–5 predefined templates (e.g., a formal tone, a warm/casual tone, and a short tone) is sufficient to satisfy "a list of email templates"; the exact wording of each is a content decision made during implementation, not a scope-defining requirement.
- The new setup guide documents the same underlying delivery mechanism already used for event-reminder emails (transactional email provider, a daily scheduled send, and Admin-configurable settings) rather than describing a different delivery approach.
- The setup guide is a single new Markdown file (its exact location/name is an implementation detail); it replaces the need to read source code or scattered comments to complete first-time setup, but may still cross-reference existing repository documentation rather than duplicating all of it.
