# Contract: Event Notification Configuration & Reminder Sending

## Admin settings UI (`src/features/notifications/NotificationSettingsPanel.tsx`)

Reads and writes the single `event_notification_config` row (data-model.md) plus, optionally, one `family_tree_notification_recipients` row per tree:

- **Enabled** toggle (spec FR-009). When off, the Edge Function takes no action at all (Edge Cases: disabling cancels all future sends — enforced simply by the function checking this flag first on every run, not by any separate "cancel" operation).
- **Template** text editor (spec FR-010). Placeholder syntax and exact editing UX are implementation details for `/speckit-tasks`; the contract only requires that whatever is saved here is the exact content used to render every reminder email.
- **Days before** number input, default `7`, non-negative (spec FR-011).
- **Default recipients** — an editable list of email addresses (spec FR-011a).
- **Per-tree override** — for any one tree, an Admin may set a separate recipient list that replaces the default list for that tree's events only (spec FR-011b); clearing the override reverts that tree to the default list (data-model.md: absence of the override row means "use the default").

Only Admin can view or edit this panel (RLS in data-model.md is the authoritative enforcement; the panel itself is simply not shown to other roles).

## Reminder Edge Function contract (`supabase/functions/send-event-reminders`)

- **Trigger**: Supabase Cron Trigger, once daily (exact time is a deployment/config detail, not a spec requirement).
- **Inputs it reads**: `event_notification_config` (must have `enabled = true` to proceed at all), every individual across every family tree, `family_tree_notification_recipients`, `event_notification_log`.
- **Algorithm** (`logic.ts`, pure and unit-testable independent of Deno):
  1. If `enabled` is `false`, exit with no side effects.
  2. For every individual with a full-precision `birth_date` (and, if `is_deceased`, `death_date`), compute the next occurrence of each recurring event (spec FR-008) and the number of days from today until that occurrence.
  3. Keep only occurrences where `days_until == days_before` (spec FR-011, FR-012) — an event further away than the window produces no action yet (spec FR-013, acceptance scenario 8), and this exact-match check means an event is only ever considered "due" once per occurrence, which combined with step 4 gives the no-duplicate guarantee.
  4. For each due occurrence, skip it if `(individual_id, event_type, event_year)` already exists in `event_notification_log` (idempotency safeguard in case the job runs more than once for the same day).
  5. Resolve recipients: the tree's override list if present, else `default_recipients`.
  6. Render `template` with that occurrence's details (person name, event type, Gregorian date, lunar date via the lunar-date-conversion contract, days until) and send one email per recipient list via the transactional email API (research.md §2).
  7. On a successful send, insert the `event_notification_log` row for that occurrence (using the service-role key, per data-model.md RLS).
- **Failure handling**: a failed send for one occurrence (e.g., the email API is unreachable) does not write a log row, so that occurrence is naturally retried on the next scheduled run rather than being silently skipped — this is a deliberate consequence of the algorithm above, not separate retry logic.

## Out of scope for this contract

- The specific transactional email provider's authentication/setup steps (an operational/deployment concern, not a spec requirement).
- Any in-app notification history/audit UI beyond what an Admin can already see by querying `event_notification_log` directly if needed — the spec does not require a dedicated history screen.
