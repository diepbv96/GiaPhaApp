# Feature Specification: Automated Supabase Deployment Workflow

**Feature Branch**: `012-supabase-deploy-workflow`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "add github workflow to auto trigger supabase command as migrate db, create/update edge functions instead of trigger manually via terminal"

## Clarifications

### Session 2026-07-24

- Q: When a second merge/trigger happens while a run is still in progress, should the new run wait its turn, take over from the in-progress one, or run alongside it? → A: Queue — a new run waits for any in-progress run to finish before starting; two migration-applies never overlap.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database migrations apply automatically on merge (Priority: P1)

A maintainer merges a change that includes a new database migration into the main branch. Today they must remember to also run the migration command from their own terminal against the live project — an easy step to forget, and one that depends on whoever merged having the right local setup. Instead, merging the change alone should be enough: the pending migration is applied to the live database automatically, and the maintainer can see that it succeeded.

**Why this priority**: This is the higher-risk, higher-value half of the request — a forgotten or inconsistently-applied migration can leave the live database and the deployed code out of sync, breaking the app for real users of the family-tree site.

**Independent Test**: Can be fully tested by merging a change containing a new, harmless migration and confirming — without running any local command — that the change is reflected in the live database and the automated run reports success.

**Acceptance Scenarios**:

1. **Given** a merge to the main branch includes one or more new database migrations, **When** the merge completes, **Then** those migrations are applied to the live project automatically, with no local terminal command required.
2. **Given** a migration fails to apply (e.g., it conflicts with the current schema), **When** the automated run encounters that failure, **Then** the run is clearly marked as failed and no further steps in that run proceed.
3. **Given** a merge to main includes no new migrations, **When** the automated run executes anyway, **Then** it completes successfully with no changes made (safe to run even when there's nothing to do).

---

### User Story 2 - Edge Functions deploy automatically on merge (Priority: P2)

A maintainer merges a change to an Edge Function's code (a new function, or an update to an existing one). Instead of separately running a deploy command from their terminal for that specific function, the updated function is deployed to the live project automatically as part of the same automated process that also applies migrations.

**Why this priority**: Valuable and part of the same "no more manual terminal commands" goal, but ordered after migrations because a function that reads from a table a migration was supposed to add is only useful once that migration has already succeeded.

**Independent Test**: Can be fully tested by merging a small, harmless change to an Edge Function's code and confirming — without running any local command — that the live, deployed function reflects the change.

**Acceptance Scenarios**:

1. **Given** a merge to main includes a change to one or more Edge Functions' code, **When** the merge completes, **Then** the changed function(s) are deployed to the live project automatically.
2. **Given** the database migration step in the same run has already failed, **When** the process would otherwise move on to deploying functions, **Then** it does not deploy any functions in that run.
3. **Given** a merge to main includes no Edge Function code changes, **When** the automated run executes anyway, **Then** it completes successfully with no functions redeployed unnecessarily.

---

### User Story 3 - Re-run on demand without a new commit (Priority: P3)

A maintainer needs the same migrate-and-deploy process to run again without pushing a new commit — for example, after fixing a transient failure (like a dropped network connection) that had nothing to do with the code itself.

**Why this priority**: A convenience and recovery path on top of Stories 1 and 2, not something needed for the core automation to deliver value on its own.

**Independent Test**: Can be fully tested by manually starting the process from the repository's automation interface (with no new commit) and confirming it runs migrations and function deployment the same way an automatic run would.

**Acceptance Scenarios**:

1. **Given** no new commit has been pushed, **When** a maintainer manually starts the process, **Then** it runs the same migration and function-deployment steps as an automatic run and reports the same kind of success/failure status.

---

### Edge Cases

- What happens when a migration and a function change are merged together, and the migration fails? The function deployment step in that same run must not proceed (see User Story 2, Scenario 2) — the maintainer fixes the migration and re-runs (User Story 3) rather than ending up with a function live against a schema it expects but that was never applied.
- What happens if two merges to main happen close together? The second run MUST wait for the in-progress run to finish before it starts (queued, never run concurrently) — see FR-010 — so it always applies the pending, cumulative set of migrations/function changes as of when it actually starts, rather than racing the first run.
- What happens if the credentials used to authenticate against the live project are missing or invalid? The run must fail clearly at that step, distinguishing "couldn't even authenticate" from "authenticated but the migration itself failed," so a maintainer isn't left guessing which part broke.
- What happens to today's documented manual steps ("run `supabase db push`", "run `supabase functions deploy`")? They must be revised so they no longer instruct a maintainer to do by hand what this automated process now does for them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically apply any pending database migrations to the live Supabase project when a merge to the main branch includes migration changes, with no manual terminal command required.
- **FR-002**: System MUST automatically deploy Edge Function code (new or updated functions) to the live Supabase project when a merge to the main branch includes Edge Function changes, with no manual terminal command required.
- **FR-003**: In any single automated run that includes both migration and Edge Function changes, migrations MUST be applied before Edge Functions are deployed.
- **FR-004**: If the migration step in a run fails, the run MUST stop and MUST NOT proceed to deploy any Edge Functions in that same run.
- **FR-005**: The process MUST also be startable on demand (without requiring a new commit), running the same migration and deployment steps as an automatic run.
- **FR-006**: Each run MUST report a clear, step-level success/failure status (at minimum, distinguishing the migration step's outcome from the function-deployment step's outcome) that a maintainer can review after the fact.
- **FR-007**: Running the process when there are no pending migrations and no changed function code MUST complete successfully without making any changes (safe/idempotent to run).
- **FR-008**: All credentials required to authenticate against the live Supabase project MUST be supplied to the workflow via the repository's GitHub Actions secret storage (Settings → Secrets and variables → Actions), never via a `.env` file (committed or generated at run time) or any other in-repository file, and MUST never appear in run logs or output.
- **FR-009**: The project's existing documentation of manual `supabase db push` / `supabase functions deploy` setup steps MUST be updated to reflect that migrations and function deployment now happen automatically, so a future reader is not instructed to duplicate the automated work by hand.
- **FR-010**: If a new run is triggered while a previous run is still in progress, the new run MUST wait for the in-progress run to finish before starting — runs are serialized, never executed concurrently against the live project.

### Key Entities

- **Automated Deployment Run**: A single execution of the migrate-then-deploy process, triggered either by a merge to main or manually on demand. Has a start time, a per-step (migrations / functions) outcome, and an overall success/failure status that serves as the audit record of what was applied and when — replacing reliance on a maintainer's memory of having run a local command.
- **Live Supabase Project Credentials**: The access token, project reference, and any other secret values needed to authenticate the automated process against the live project. Stored as GitHub Actions repository secrets, never in source code and never in a `.env` file consumed by the workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of database migrations merged to main are applied to the live project without any maintainer running a local terminal command.
- **SC-002**: 100% of Edge Function changes merged to main are deployed to the live project without any maintainer running a local terminal command.
- **SC-003**: Every migration or function deployment made after this feature ships has a corresponding, reviewable run record — zero deployments happen with no trace of when/how they occurred.
- **SC-004**: When a migration fails during an automated run, zero Edge Function deployments are attempted in that same run, 100% of the time.
- **SC-005**: A maintainer can determine, within one minute of looking at the latest run, whether the last merge's migrations and function deployments both succeeded.

## Assumptions

- There is a single live Supabase project (matching today's setup — one `project_id` in `supabase/config.toml`, no separate staging/production split); this feature automates deployment to that one project rather than introducing multiple environments.
- The automated process runs without a manual approval/gate step before applying changes to the live project — merging to main is itself the approval, consistent with the request to remove the manual terminal step entirely rather than replace it with a manual click elsewhere. Introducing an approval gate later, if wanted, would be an additive change on top of this feature, not a blocker to it.
- The process is triggered by merges to the main branch that touch database migration files or Edge Function code, plus an on-demand manual trigger (Story 3); it does not run migrations against the live project for pull requests that haven't merged yet.
- Failure visibility is satisfied by the repository's existing automation-run status/log (the same place today's other automated checks already report), matching the project's current practice — no separate notification channel (e.g., email/chat alerts) is assumed to be in scope.
- "Edge Functions" in scope means the functions already present under the project's Supabase functions directory (currently one: the event-reminder sender) plus any added in the future — the automation deploys whatever functions exist at merge time, not a hand-maintained list that must be kept in sync separately.
